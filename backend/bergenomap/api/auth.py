from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify, request

from bergenomap.repositories.db import get_db
from bergenomap.repositories import sessions_repo, users_repo
from bergenomap.utils.password import hash_password, verify_password


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

    # Whitelist registration endpoint
    if request.path == "/api/register":
        return

    session_key = request.cookies.get("session_key")
    if not session_key:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db()
    session = sessions_repo.validate_session(db, session_key)
    if not session:
        return jsonify({"error": "Unauthorized"}), 401
    g.username = session.get("username")


@bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    raw_username = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    # Temporary special case: entering the creator's full name logs you in as geir.smestad.
    # Password is ignored.
    if raw_username == "Geir Smestad":
        username = "geir.smestad"
        db = get_db()
        users_repo.ensure_user_exists(db, username)
    else:
        username = raw_username.lower()
        if not username:
            return jsonify({"error": "Invalid credentials"}), 401

        db = get_db()
        user = users_repo.get_user_with_pw_hash(db, username)
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        if user.get("pw_hash") is None:
            return jsonify({"error": "Invalid credentials"}), 401
        if not verify_password(password, user.get("pw_hash")):
            return jsonify({"error": "Invalid credentials"}), 401

    session_key = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(days=365)

    sessions_repo.create_session(db, username, session_key, expires_at)

    response = jsonify({"message": "Login successful", "username": username})
    response.set_cookie(
        "session_key",
        session_key,
        expires=expires_at,
        httponly=False,
        samesite="Lax",
    )
    return response


@bp.route("/api/register", methods=["POST"])
def register():
    """
    Minimal registration endpoint.

    Payload:
      - username (email) OR email
      - password
    """
    data = request.get_json(silent=True) or {}
    raw_username = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""
    username = raw_username.lower()
    if not username or "@" not in username:
        return jsonify({"error": "username must be an email address"}), 400
    if not password:
        return jsonify({"error": "password is required"}), 400

    db = get_db()
    try:
        users_repo.create_user(db, username, hash_password(password))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    session_key = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(days=365)
    sessions_repo.create_session(db, username, session_key, expires_at)

    response = jsonify({"message": "Registered", "username": username})
    response.set_cookie(
        "session_key",
        session_key,
        expires=expires_at,
        httponly=False,
        samesite="Lax",
    )
    return response, 201


@bp.route("/api/logout", methods=["POST"])
def logout():
    """
    Deactivate the current session and clear cookie.
    """
    session_key = request.cookies.get("session_key")
    if session_key:
        db = get_db()
        sessions_repo.deactivate_session(db, session_key)

    response = jsonify({"message": "Logged out"})
    # Clear cookie for browser clients.
    response.set_cookie("session_key", "", expires=0)
    return response, 200


@bp.route("/api/auth/me", methods=["GET"])
def me():
    """
    Minimal helper endpoint for frontend code: who am I according to the current session?
    """
    username = getattr(g, "username", None)
    if not username:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"username": username}), 200


