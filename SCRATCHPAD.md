MY QUESTION TO CHATGPT: Please sketch in human language how I'd connect to Strava with an app, including permissions/authentication.

Here’s the “human-language” version of how you hook an app up to Strava and get permission to read activities, etc.

1. Create an app in your Strava account

Log in to Strava in a browser.

Go to Settings → My API Application (or directly to the API settings page). 
Strava Utviklere
+1

Fill in:

App name, logo, category

Website (can be http://localhost for local dev)

Authorization callback domain – the domain Strava is allowed to redirect back to (e.g. localhost or your real domain).

Strava then gives you:

Client ID

Client secret (keep this secret, server-side only) 
Strava Utviklere
+1

2. Decide what you want access to (scopes)

Strava uses OAuth scopes to control what your app can do. Common ones: 
Strava Utviklere
+1

read – basic public data.

activity:read – read non-private activities.

activity:read_all – read all activities (including “Only Me”).

profile:read_all, profile:write, etc., for profile changes.

For “download my runs and reconstruct GPX”, you typically want activity:read_all (plus read).

3. Send the user to Strava to approve access

Your app builds an authorize URL like:

https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&approval_prompt=force&scope=read,activity:read_all 
Strava Utviklere
+1

Flow:

User clicks “Connect with Strava” in your app.

You redirect them to that Strava URL.

Strava shows a page: “App X wants to read your activities…”.

User approves or cancels.

If they approve, Strava redirects the browser back to your redirect_uri, with a query param like:

?code=AUTHORIZATION_CODE&scope=read,activity:read_all

4. Exchange the code for tokens (server-side)

Your backend then calls Strava’s token endpoint:

POST https://www.strava.com/oauth/token

with body / params roughly:

client_id

client_secret

code (the one from the redirect)

grant_type=authorization_code 
Strava Utviklere
+1

Strava responds with JSON containing:

access_token – short-lived (about 6 hours).

refresh_token – long-lived, used to get new access tokens.

expires_at – timestamp when the access token dies.

Info about the athlete who just connected.

You store (securely):

Athlete ID

Their refresh token

Maybe last sync time, etc.

5. Use the access token in API calls

For any Strava API request on behalf of that user, you send:

Authorization: Bearer ACCESS_TOKEN


in the header. 
Strava Utviklere
+1

Examples:

GET /api/v3/athlete – who is this.

GET /api/v3/athlete/activities – list their activities, using the scopes you got. 
Strava Utviklere
+1

From there you can pull activity streams and build your own GPX.

6. Refreshing tokens

When the access token expires:

Your app notices expires_at has passed.

It calls the same token endpoint with:

grant_type=refresh_token

refresh_token=STORED_REFRESH_TOKEN 
stravalib.readthedocs.io
+1

Strava returns a new access token (and often a new refresh token).

You update the stored token(s).

The user doesn’t have to re-approve; this is all background.

7. Permissions / safety model

Users can revoke your app’s access from their Strava settings at any time.

Your app only sees what its scopes allow.

You must keep the client secret, access tokens, and refresh tokens on the server and out of client-side JS or public repos. 
Strava Utviklere
+1

If you tell me what stack you’re using (Python/Flask, Node, etc.), I can translate this into a concrete “one file” auth flow sketch for that ecosystem.

MY QUESTION TO CHATGPT: What do I need to store in my app's database to be able to maintain this integration?

At minimum, per Strava athlete (user) you want to store enough to (a) refresh tokens forever and (b) know what you’ve already synced.

Must-have (per connected Strava user)

strava_athlete_id (the stable Strava user id)

refresh_token (long-lived; lets you mint new access tokens)

access_token (optional to store, but convenient)

expires_at (epoch timestamp; so you know when to refresh)

granted_scopes (string/array, e.g. read,activity:read_all) — useful to detect missing permissions

connected_at / updated_at timestamps

Highly recommended

token_last_refreshed_at (debugging / rate-limit correlation)

revoked_at / disconnected_at (set when API calls start failing with auth errors, or user disconnects)

last_activity_sync_at (or last_activity_start_date) so you can do incremental syncs

strava_webhook_subscription_id (if you use webhooks) + webhook verify token / secret handling (secret shouldn’t be in DB unless you rotate; usually env config)

If you store activities locally

Per activity you typically store:

strava_activity_id (unique)

athlete_id (FK)

start_date, type, name

last_updated_at (from Strava) or etag/hash so you can resync when it changes

Optional: a cached GPX blob you generated (or store the decoded track/points)

That’s basically it: athlete id + refresh token + expiry bookkeeping + sync cursor. Access tokens are replaceable; refresh tokens are the crown jewels.

What rate limits does Strava documentation mention, for fetching activities? If any

Here’s what the official Strava documentation says about API rate limits (as of the current docs):

📊 Official documented limits

Default rate limit:
• 200 requests per 15 minutes
• 2,000 requests per day
Strava calls this the overall rate limit for an application. 
developers.strava.com
+1

There’s also a “non-upload” limit which, by default, is lower:
• 100 requests per 15 minutes
• 1,000 requests per day
The non-upload category includes most GET calls like fetching activities and streams. 
developers.strava.com

📈 Header feedback

Every API response includes two headers that tell you your current usage and limits:

X-RateLimit-Limit — e.g., 100, 1000 meaning 100 per 15m and 1000 per day

X-RateLimit-Usage — how many you’ve used so far
That lets your app throttle before hitting the hard cap. 
communityhub.strava.com

⚠️ Exceeding the limit

If you go over:

The API returns HTTP 429 Too Many Requests.

You need to wait for the next 15-minute block (or next day for the daily cap) before more calls will succeed. 
developers.strava.com

🔧 Notes & gotchas

Strava may adjust limits for larger apps on review—but there’s no guarantee; you typically have to ask them through their developer contact process. 
communityhub.strava.com

Community reports vary a bit because rate limits have changed over time; some older sources mention 600/15 min & 30 000/day, but the official current doc shows 200/15 min and 2 000/day. Always check your own X-RateLimit headers to confirm per-app values. 
developers.strava.com

If you want, I can outline a way to build a client that watches those headers and auto-throttles to stay under these limits.

MY QUESTION TO CHATGPT: I need API calls for listing available activities and listing a stream for a given activity. Can you list the API calls I might use?

These are the exact Strava API endpoints you’d typically use for that use-case, with brief notes on what each is good for.

1. List activities for the authenticated user

Endpoint

GET https://www.strava.com/api/v3/athlete/activities


Purpose

Lists the user’s activities (runs, rides, hikes, etc.)

This is how you discover activity IDs

Required scope

activity:read (public activities)

activity:read_all (includes private / “Only Me”)

Common query parameters

before – Unix timestamp (upper bound on activity start time)

after – Unix timestamp (lower bound)

page – pagination (starts at 1)

per_page – up to 200 (important for rate efficiency)

Returns

Array of activity summaries:

id

name

type

start_date

distance, time, elevation, etc.

No track points here — just metadata.

2. (Optional but useful) Get full activity details

Endpoint

GET https://www.strava.com/api/v3/activities/{activity_id}


Purpose

Fetches richer metadata for a single activity

Still not the full GPS track

Required scope

Same as above (activity:read[_all])

Returns

Everything from the summary plus:

gear, splits, laps, map polyline (simplified), etc.

3. Fetch streams (this is where GPS lives)

Endpoint

GET https://www.strava.com/api/v3/activities/{activity_id}/streams


Purpose

Fetch time-series data needed to reconstruct GPX

Required scope

activity:read or activity:read_all

Key query parameter

keys=latlng,time,altitude,heartrate,cadence


(You choose what you need.)

Optional:

key_by_type=true


→ returns a dict keyed by stream name instead of a list

Important streams

latlng – array of [lat, lon]

time – seconds since activity start

altitude – meters

heartrate, cadence – optional extras

Returns

Ordered arrays with equal length → easy to zip into GPX <trkpt> entries

4. Auth header (for all of the above)

Every request needs:

Authorization: Bearer ACCESS_TOKEN

Typical minimal flow (what you’ll actually do)

GET /athlete/activities
→ store (activity_id, start_date, type, last_updated)

For each new activity:

GET /activities/{id}/streams?keys=latlng,time,altitude

Convert streams → GPX

Cache result locally to avoid re-hitting rate limits