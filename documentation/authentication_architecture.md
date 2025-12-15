# Authentication System Architecture

The authentication system is designed to provide rudimentary access control to the BergenOmap application. It uses a split architecture involving both Nginx and the Flask backend.

## 1. Overview

-   **Goal**: Restrict access to the map application to users who know the creator's full name.
-   **Method**: A shared session cookie (`session_key`) is used by both the web server (Nginx) and the application server (Flask).
-   **Login**: Users verify their identity on `/login.html`.

## 2. Components

### A. Nginx (Static File Server)
Nginx acts as the first line of defense for static assets (HTML, CSS, JS).

-   **Mechanism**: Checks for the presence of the `session_key` cookie.
-   **Behavior**:
    -   If the cookie is **missing**: Redirects specific requests (like `/` or `/map.html`) to `/login.html`.
    -   If the cookie is **present**: Serves the requested file.
-   **Note**: This check is superficial (existence only) to maintain performance for static files.

### B. Flask Backend (API Server)
The Flask application protects the data and database access.

-   **Mechanism**: Validates the `session_key` against the `sessions` database table.
-   **Behavior**:
    -   **Login Endpoint (`/api/login`)**:
        -   Accepts a POST request with `full_name`.
        -   If correct ("Geir Smestad"), generates a UUID session key.
        -   Stores the key in the SQLite `sessions` table (valid for 1 year).
        -   Returns the key as a HTTP cookie.
    -   **Middleware (`before_request`)**:
        -   Intercepts all requests to `/api/*` (except login).
        -   Queries the database to ensure the session key matches an active session.
        -   Returns `401 Unauthorized` if invalid.

### C. Database
A SQLite table `sessions` stores valid sessions.

-   **Schema**:
    -   `session_key` (Primary Key, UUID)
    -   `username` (Linked to `users` table)
    -   `expires_at` (Datetime)
    -   `is_active` (Boolean)

## 3. Workflow

1.  **User Visits Site**: Browser requests `omaps.twerkules.com`.
2.  **Nginx Check**: Nginx sees no cookie -> Redirects to `login.html`.
3.  **User Logs In**: User enters name. JS sends POST to `/api/login`.
4.  **Backend Verification**: Flask checks name -> Creates session -> Sets cookie.
5.  **Redirect**: JS redirects user back to `/map.html`.
6.  **Access Granted**:
    -   Nginx sees cookie -> Serves `map.html`.
    -   Map loads -> Requests API data.
    -   Flask sees cookie -> Validates in DB -> Returns data.

## 4. Local Development

To simplify local development, authentication checks are bypassed when both of the following conditions are met:
1.  The request originates from a local address (`127.0.0.1` or `localhost`).
2.  The Flask application is running in debug mode.

This allows developers to test the application locally without needing to log in or configure Nginx/cookie handling for cross-port requests.
