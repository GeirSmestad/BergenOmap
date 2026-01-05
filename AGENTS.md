# AGENTS.md - Cursor Agent Instructions

This file provides context and guidelines for AI agents working on this codebase.

## Project Overview

- This is an orienteering map application, for map georeferencing, navigation and reviewing GPS tracks from training or races
- Project structure is mostly reflected in the folder structure

## Coding philosophy

- Pragmatism over purity. Prefer readable, maintainable solutions. Principles are a tool for *managing* complexity, not growing it.
- Readability first. Use explicit, descriptive names. Aim for self-explanatory code. Avoid excessive cleverness.
- No unit tests for now. This may change later, so modular code structure is encouraged.
- Validation: Perform whatever lightweight validation is suitable after making changes
- Comment only when necessary. *Why*, not *what*, unless the mechanics of a block isn't obvious. Add rationale only when code alone does not convey it. Comment intent/reason when readers would be left wondering, but not otherwise.

## Tech Stack

- **Frontend**: Vanilla JavaScript (as ES modules), HTML, CSS
- **Backend**: Python (Flask-based), served via `Backend.py`
- **Database**: SQLite (`data/database.db`)
- **Maps**: Leaflet.js with Norwegian map tiles from Kartverket
- **Runtime/hosting**: Rebuildable (cattle-style) VPS (Lightsail) with nginx, using `Justfile` for task automation and `bootstrap.sh` to rebuild the server.

## Where to find more info

- If you require information about the server runtime environment to answer a query, check `bootstrap.sh`, which is the source of truth for server config. You may also check `README.md`, specifically under the heading `## Deployment`. 
- The `Justfile` is relevant for how to structure ssh and deployment commands from the development environment
- `README.md` in the root folder has the full TODO list and information about development environment setup.
- The `documentation` folder has explicit documentation on a few features that require extra care to understand; their file names are a sufficient high-level description of the contents.
- Check .cursor/rules/ for language-specific coding conventions

## How to run the app locally

The development environment may be either OS X & Terminal or Windows & Powershell; this might be relevant for environment-impacting questions.

```bash
# Backend (from repo root)
cd backend
python3 Backend.py

# Frontend static server (from repo root)
python3 -m http.server 8000

# Access the app at e.g. http://127.0.0.1:8000/map.html
```

## Database

SQLite database at `data/database.db`. Migrations are numbered SQL scripts in `backend/db_migrations/`.

Key tables:
- `maps` - Registered orienteering maps with geo-reference data
- `gps_tracks` - Imported GPX *files* (as opposed to Strava activities)
- `users` - User accounts
- `sessions` - Auth sessions
- `internal_kv` - Key-value store for *exclusively* internal app use
- `strava_*` - Strava integration (mirrored and imported activities, API connection data)

## Miscellaneous Notes

- Code and markup is English, user-facing text is Norwegian. (Except in map registration, where user-facing text is English).
- Map registration involves complex geo-referencing calculations
- GPS lat/lon coordinates use 6 decimal places precision

