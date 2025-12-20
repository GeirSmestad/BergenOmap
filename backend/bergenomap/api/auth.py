from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request

from bergenomap.api.common import is_local_request
from bergenomap.repositories.db import get_db
from bergenomap.repositories import sessions_repo, users_repo


bp = Blueprint("auth", __name__)


@bp.before_app_request
def check_authentication():
    # Allow OPTIONS requests for CORS preflight
    if request.method == "OPTIONS":
        return

    # Only protect /api/ routes
    if not request.path.startswith("/api/"):
        return

    # Whitelist login endpoint
    if request.path == "/api/login":
        return

    # Check if we are running locally (debug mode or localhost)
    if is_local_request() and current_app.debug:
        return

    session_key = request.cookies.get("session_key")
    if not session_key:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db()
    try:
        session = sessions_repo.validate_session(db, session_key)
        if not session:
            return jsonify({"error": "Unauthorized"}), 401
    except Exception:
        # If database validation fails (e.g. table doesn't exist yet), deny access
        return jsonify({"error": "Unauthorized"}), 401


@bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    full_name = data.get("full_name")

    if full_name != "Geir Smestad":
        return jsonify({"error": "Invalid credentials"}), 401

    username = "geir.smestad"  # Default user for now
    session_key = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(days=365)

    db = get_db()
    users_repo.ensure_user_exists(db, username)
    sessions_repo.create_session(db, username, session_key, expires_at)

    response = jsonify({"message": "Login successful"})
    response.set_cookie(
        "session_key",
        session_key,
        expires=expires_at,
        httponly=False,
        samesite="Lax",
    )
    return response


