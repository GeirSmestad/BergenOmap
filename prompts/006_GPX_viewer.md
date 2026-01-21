# GPX viewer

We will start implementing the GPX viewer feature.

Let's start with the back-end. I need a new database table, "users", that stores the different people who may use the app. It should have a unique username as primary key, for now. Make create table and get operations for it, but don't expose them in Backend.py yet. Write a query for creating it. We will have a single default user for now, geir.smestad. 

We will also need a second table, gps_tracks, that stores the different runs the user has uploaded. It should have a sequential integer primary key, username foreign key, a BLOB field for a gpx file, and a text field called "description". Make create table, list and insert (by username) and get (by username and integer key) operations for it. 

Give me the SQL queries for table creation, so I can run them separately from the code.

I also have a test GPX file, tell me how to get it into the table for the default user we will use for all testing.


## GPS track page

We will now create a new page to browse and view GPS tracks in the context of maps. For now, you can assume that the simulated user is always geir.smestad; hard-code this.

This new page will live under gpxBrowser.html. The page will have very similar functionality to map.html, with some modifications. Assume it will be identical, apart from the differences I mention. You can re-use existing ES modules from map.html where appropriate, or duplicate funcionality if the existing module is close but not quite re-usable. I don't care too much about efficiency, so direct re-use that simply hides unused functionality in the UI is preferable to duplicating functionality.

The page should have an identical Leaflet map list. It should *not* have the "followPositionToggle" functionality. It should not care about the user's current GPS position at all; nothing related to that needs to be included. It must have a map list just like map.html, but the "nearMe" map selector mode should not be available. We will only need the "nearViewport" option. The page must query the backend for all available maps, just like map.html. In a future version, I probably want a new filtering option for this list to show only maps that intersect the currently selected GPX track (that will have practically-identical UX to the existing map selector mode), but this is not currently needed.

We will also need a GPX list. It can be very similar to the map list, both visually and functionally. It must load all GPX tracks for the (simulated) user on page load. For now it can show all GPX tracks. Display only the description of each for now. This list will probably eventually have a filter to display only GPX tracks that intersect the currently selected map, but this is not currently needed. This list can be implemented very similarly to the existing map list, but it should live in separate ES modules under the gpxBrowser folders/namespace.

Don't implement functionality for actually viewing GPX tracks yet, we will do that later. Write an implementation that is maintainable and extensible.


## GPX track drawing

Now we will implement functionality to draw a GPX track. We will only ever draw one at a time, and the one that's being drawn will be the one that is selected in the GPX list. Use Leaflet drawing functionality if this is an option, and make sure you'll draw on top of the selected orienteering map overlay if one is selected.

Make sure you implement the drawing functionality in separate module(s), so it can be modified independently later. For now, you can use a red pen for drawing. Line thickness *might* have to vary with differing zoom levels; check what options are available in Leaflet's API in this regard. If Leaflet's functionality does not allow for lines that automatically scale with zoom level, just use a single hard-coded size for now, but explain to me the possibilities in your output.

Future drawing features, not to be implemented now but provided for your context, will be a line that is not solid red but has different color depending on runner speed, as well as *playback* of a race by instead of a line, drawing a marker that will gradually move through the GPX track in a sped-up replay of the runner's location.
