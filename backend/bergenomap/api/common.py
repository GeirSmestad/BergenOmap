from __future__ import annotations

from flask import request


def is_local_request() -> bool:
    # Keep the exact semantics from legacy Backend.py for now.
    return request.remote_addr in ["127.0.0.1", "localhost"]


