#!/usr/bin/env python3
"""
Smart deployment script that only copies files that have changed.
Uses MD5 checksums to compare local and remote files.
"""

import argparse
import hashlib
import os
import subprocess
import sys
from pathlib import Path


def compute_local_checksums(paths: list[str], base_dir: str = ".") -> dict[str, str]:
    """Compute MD5 checksums for all files in the given paths."""
    checksums = {}
    base = Path(base_dir)
    
    for path_str in paths:
        path = base / path_str
        if path.is_file():
            # Single file
            rel_path = path_str
            checksums[rel_path] = md5_file(path)
        elif path.is_dir():
            # Directory - recurse
            for file_path in path.rglob("*"):
                if file_path.is_file() and not should_skip(file_path):
                    rel_path = str(file_path.relative_to(base)).replace("\\", "/")
                    checksums[rel_path] = md5_file(file_path)
        # Skip if path doesn't exist (like *.html patterns handled separately)
    
    return checksums


def should_skip(path: Path) -> bool:
    """Check if a file should be skipped."""
    skip_patterns = ["__pycache__", ".pyc", ".pyo", ".git"]
    path_str = str(path)
    return any(pattern in path_str for pattern in skip_patterns)


def md5_file(path: Path) -> str:
    """Compute MD5 hash of a file."""
    hasher = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def get_remote_checksums(server: str, remote_path: str, paths: list[str]) -> dict[str, str]:
    """Get MD5 checksums for files on the remote server."""
    # Build a shell command that computes md5sum for all relevant files
    # We use find to locate files, then md5sum to hash them
    path_args = " ".join(f'"{remote_path}/{p}"' for p in paths)
    
    # This command:
    # 1. For each path, find all files (not directories, not __pycache__)
    # 2. Compute md5sum for each
    # 3. Output in format: <hash>  <relative_path>
    remote_script = f'''
cd "{remote_path}"
for path in {" ".join(paths)}; do
    if [ -f "$path" ]; then
        md5sum "$path" 2>/dev/null
    elif [ -d "$path" ]; then
        find "$path" -type f ! -path "*/__pycache__/*" ! -name "*.pyc" -exec md5sum {{}} \\;  2>/dev/null
    fi
done
'''
    
    try:
        result = subprocess.run(
            ["ssh", server, "bash", "-c", remote_script],
            capture_output=True,
            text=True,
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not get remote checksums: {e.stderr}", file=sys.stderr)
        return {}
    
    checksums = {}
    for line in result.stdout.strip().split("\n"):
        if line and "  " in line:
            parts = line.split("  ", 1)
            if len(parts) == 2:
                hash_val, file_path = parts
                # Normalize path (remove leading ./)
                file_path = file_path.lstrip("./").replace("\\", "/")
                checksums[file_path] = hash_val
    
    return checksums


def find_changed_files(local: dict[str, str], remote: dict[str, str]) -> tuple[list[str], list[str]]:
    """
    Compare checksums and return files that need to be copied.
    Returns (changed_files, new_files)
    """
    changed = []
    new = []
    
    for path, local_hash in local.items():
        if path not in remote:
            new.append(path)
        elif remote[path] != local_hash:
            changed.append(path)
    
    return changed, new


def copy_files(files: list[str], server: str, remote_path: str, dry_run: bool = False):
    """Copy the specified files to the server."""
    if not files:
        return
    
    for file_path in files:
        remote_file = f"{server}:{remote_path}/{file_path}"
        
        # Ensure remote directory exists
        remote_dir = os.path.dirname(file_path)
        if remote_dir:
            mkdir_cmd = f'mkdir -p "{remote_path}/{remote_dir}"'
            if dry_run:
                print(f"  [dry-run] ssh {server} '{mkdir_cmd}'")
            else:
                subprocess.run(["ssh", server, mkdir_cmd], check=True)
        
        if dry_run:
            print(f"  [dry-run] scp {file_path} -> {remote_file}")
        else:
            print(f"  Copying: {file_path}")
            subprocess.run(["scp", file_path, remote_file], check=True)


def main():
    parser = argparse.ArgumentParser(description="Smart deploy with checksum comparison")
    parser.add_argument("--server", required=True, help="SSH server alias")
    parser.add_argument("--remote-path", required=True, help="Remote base path")
    parser.add_argument("--paths", required=True, nargs="+", help="Paths to sync (files or directories)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be copied without copying")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Expand glob patterns for files (like *.html)
    expanded_paths = []
    for p in args.paths:
        if "*" in p:
            # Glob pattern
            matches = list(Path(".").glob(p))
            expanded_paths.extend(str(m) for m in matches if m.is_file())
        else:
            expanded_paths.append(p)
    
    if args.verbose:
        print(f"Paths to sync: {expanded_paths}")
    
    print("Computing local checksums...")
    local_checksums = compute_local_checksums(expanded_paths)
    if args.verbose:
        print(f"  Found {len(local_checksums)} local files")
    
    print("Getting remote checksums...")
    remote_checksums = get_remote_checksums(args.server, args.remote_path, expanded_paths)
    if args.verbose:
        print(f"  Found {len(remote_checksums)} remote files")
    
    changed, new = find_changed_files(local_checksums, remote_checksums)
    
    if not changed and not new:
        print("No files have changed. Nothing to deploy!")
        return
    
    if changed:
        print(f"\nChanged files ({len(changed)}):")
        for f in changed:
            print(f"  ~ {f}")
    
    if new:
        print(f"\nNew files ({len(new)}):")
        for f in new:
            print(f"  + {f}")
    
    all_files = changed + new
    print(f"\nCopying {len(all_files)} file(s)...")
    copy_files(all_files, args.server, args.remote_path, args.dry_run)
    
    if args.dry_run:
        print("\n[Dry run complete - no files were actually copied]")
    else:
        print(f"\nDeployed {len(all_files)} file(s).")


if __name__ == "__main__":
    main()

