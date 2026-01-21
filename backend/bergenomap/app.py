from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from bergenomap.api.admin import bp as admin_bp
from bergenomap.api.auth import bp as auth_bp
from bergenomap.api.maps import bp as maps_bp
from bergenomap.api.stored_points import bp as stored_points_bp
from bergenomap.api.strava import bp as strava_bp
from bergenomap.api.tracks import bp as tracks_bp
from bergenomap.repositories.db import close_db


def create_app() -> Flask:
    app = Flask(__name__)

    # Use cross-origin resource sharing in return headers, to tell browser to allow
    # responses from different origin.
    # Needed for local dev where the UI may be served from a different origin (port)
    # than the API, but sessions are cookie-based.
    CORS(app, supports_credentials=True)

    # Register API surface (paths must stay stable).
    app.register_blueprint(auth_bp)
    app.register_blueprint(maps_bp)
    app.register_blueprint(tracks_bp)
    app.register_blueprint(stored_points_bp)
    app.register_blueprint(strava_bp)
    app.register_blueprint(admin_bp)

    # DB lifecycle
    app.teardown_appcontext(close_db)

    return app


