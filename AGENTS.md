# AGENTS.md - Cursor Agent Instructions

This file provides context and guidelines for AI agents working on this codebase.

## Project Overview

BergenOmap is an orienteering map application for Norway, with GPS support for navigation in unfamiliar terrain. The app allows users to:

- Add and geo-reference one's copies of orienteering maps
- View these orienteering maps and navigate them with GPS positioning
- Import and view GPX tracks from activities, overlaid on any saved orienteering map
- Connect with Strava for import of the user's historical strava activities to view on the maps
- Provide a separate instance of this behavior for each user of the app

## Coding Conventions

### General Philosophy

- **Pragmatism over purity**: Write practical, readable, maintainable code. Normal software engineering practices are a good guideline, but don't overdo any particular principle. Make pragmatic decisions and tradeoffs, that make it easy for future maintainers to understand what's going on.
- **No unit tests**: No unit tests for now. This might change later.
- **Readability first**: Good variable and function names are important. Prefer explicit rather than clever functions.
- **Comment intent, not mechanics**: Explain *why*, not *what*. The code should generally aspire to document itself in terms of behavior, by using clear, unambiguous naming. But there may be instances where this is not sufficient, especially when the *intention* or *reason* for a particular decision is not clear from the code alone. Your prompt might give information about the business rationale of a particular decision that might be relevant for future maintainers. Make a deliberate judgement on this whenever you consider commenting. Would a future maintainer wish to know the rationale behind this piece of code, or would a comment be superfluous?

### JavaScript
- Use **explicit boolean checks** (`if (value === true)`) rather than implicit truthy/falsy testing
- Use a sensible ES module separation for new code (see `js/mapBrowser/`, `js/registerMap/` for examples)
- Prefer clear, descriptive variable names over brevity

### Python
- Follow existing patterns in `backend/bergenomap/`
- Use the repository pattern for database access

### CSS
- Separate CSS files per page/feature

## Tech Stack

- **Frontend**: Vanilla JavaScript (with ES modules), HTML, CSS
- **Backend**: Python (Flask-based), served via `Backend.py`
- **Database**: SQLite (`data/database.db`)
- **Maps**: Leaflet.js with Norwegian map tiles from Kartverket
- **Deployment**: VPS (Lightsail) with nginx, using `Justfile` for task automation. If you require information about the runtime environment to answer a query, check `boostrap.sh`, which is the source of truth for server config. You should also reference `README.md`, specifically under the heading `## Deployment`. The `Justfile` is also relevant for how to structure ssh and deployment commands in this development environment.
- **Documentation**: `README.md` in the root folder has the full TODO list and information about development environment setup. The `documentation` folder has explicit documentation on a few features that require extra care to understand.

## Development Environment

```bash
# Start backend server (macOS)
cd /Users/Geir/Source/BergenOmap/backend
python3 Backend.py

# Start frontend dev server (macOS)
cd /Users/Geir/Source/BergenOmap
python3 -m http.server 8000

# Access the app at e.g. http://127.0.0.1:8000/map.html
```

Backend runs on port 5000 by default.

## Project Structure

```
backend/           # Python backend
  bergenomap/      # Main application package
    api/           # API route handlers
    repositories/  # Database access layer
    services/      # Business logic
    utils/         # Utility functions
  db_migrations/   # SQL migration scripts (mostly for historical purposes; we don't have a manager for schema history)
css/               # Stylesheets (per-page CSS files)
  themes/          # Experiments with themes; not used in the app itself
js/                # Frontend JavaScript
  mapBrowser/      # Map viewing functionality
  registerMap/     # Map registration functionality. Separate front-end for mobile and desktop.
  gpxBrowser/      # GPX track viewing
  stravaConnection/ # Strava integration
lib/               # Vendored libraries (Leaflet)
data/              # SQLite database
```

## Database

SQLite database at `data/database.db`. Migrations are numbered SQL scripts in `backend/db_migrations/`.

Key tables:
- `maps` - Registered orienteering maps with geo-reference data
- `gps_tracks` - Imported GPX tracks
- `users` - User accounts
- `sessions` - Auth sessions
- `strava_*` - Strava integration tables

## Miscellaneous Notes

- The app is primarily in Norwegian (code comments may mix Norwegian and English)
- Map registration involves complex geo-referencing calculations (see `js/registerMap/`)
- GPS coordinates use 6 decimal places precision
- Map images are stored as WebP (100% quality) for production

