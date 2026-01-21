# Strava integration

-Store STRAVA_CLIENT_SECRET somewhere safe. DB table?
-Need DB table with auth information for each user (connected to user ID)
-Need DB table with all activities we have previously fetched from Strava, for each user + converted GPX

-Display Strava connection information somewhere on the page & orchestrate connection approval

-Display DB table with all activities fetched from strava in one view
-Display list of all available Strava activities in different view + filters + download button
-One filter for available Strava activities: "Select all activities that start on one of my maps".

-Display downloaded Strava GPXes in GPX browser list

## Prompt suggestion:

We will now start working on Strava integration. Here's the high-level overview of the feature:

-Separate page, stravaConnection.html. Navigable to and from using app-menu-toggle
-Must work fine on both mobile and desktop
-This page lets the user do the following:
    -approve a connection to their Strava account,
    -view and filter their Strava activities
    -select any number of their Strava activities to import to our app. (These will be available to select in the GPX viewer).
    -view the list of activities that *have been imported this way* to our app
    -Delete the copy in our app if desired. Re-download and overwrite the copy of the activity in our app, if desired.

We will develop a plan for this feature. The technical needs should be obvious from the above, but re-stating them here:

* A new database table, containing only key-value pairs. This will ONLY be accessible to other parts of our backend, not the web. We will use this to store the STRAVA_CLIENT_SECRET. This is acceptable for now.

* A new DB table with auth information for each user that has given approval (connected to user ID in our app)
* A DB table with all activities we have previously fetched from Strava, for each user, + converted GPX of its track

* Must obviously display Strava connection information somewhere on the page & orchestrate connection approval

* There must be separate views of the activities in Strava and the activities we have imported to our app

* One of the filters for available Strava activities: "All activities that start on one of my maps". This should examine the lat/lon starting point of each Strava activity, and compare it to the boundaries of all maps in the map database. Display only activities that start within one of the maps.

* Simple error handling for things that can go wrong with the Strava API

Read SCRATCHPAD.md for an overview of my conversation with ChatGPT, which provides extra context regarding how Strava's API works. I have a client secret already.

Please start sketching the plan for this, I will modify it based on your suggestions. I want a *pragmatic* implementation. We will probably iterate on it a bit after you're eventually finished with the first version.
