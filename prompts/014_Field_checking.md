# Field checking ("Synfaring")

We will implement a new mode for the app. It will be a new page called fieldInspection.html. It will contain essentially all of the features of map.html.

Duplicate/copy all the js files of mapBrowser for this feature, to a separate fieldChecking folder. Rename files and variables where appropriate, to avoid confusion with the map feature. But only do this where necessary; don't over-think it. We've already performed a duplication like this before, for the GPX feature, and that works fine with no confusion.

Also copy map.html, of course, and whatever else you need. This feature should only touch other parts of the app in very minor ways, if at all.

This page will let the user place markers in the terrain. These will be persisted to a database, stored per user.

## Database support

- Create a new database table 'field_checking'. It contains points that have been stored by the user:
  - id (int, ascending, primary key)
  - lat (real, 6 digit precision however you want to enforce that)
  - lon (real, 6 digit precision however you want to enforce that)
  - precision_meters (int, nullable)
  - description (text)
  - user (fk to 'username' in the 'users' table)

We need backend support for these; CRUD operations and DAL layer functionality, plus of course updates of the create_table function to reflect the new table.

## Feature gating for pilot users

This is an experimental feature. It's not secret or sensitive, and requires no special access control. But it won't be *delibarately* exposed to all users in the app menu. It will only be exposed to logged-in user 'geir.smestad'. This user is a pilot user. We can hard-code the list of pilot users.

For pilot users, the Field checking feature will have its own link in the app menu. Implement this in a minimal but general way, referring to this page as a pilot feature.

## Specific page adaptation

Two buttons from the map page will not be visible on this page: followPositionToggle and fixedZoomToggle. Hide them.

## Adding new stored points

We will eventually have an option for *moving* a particular point by dragging it, or creting a new point by placing it, dragging it and confirming placement. But the UX of this isn't obvious, due to interaction with map navigation controls, so we won't do it in v1.

Instead, put a button to the right of 'showPositionToggle', titled 'Merk posisjon'. It's only clickable if user location is available.

Pressing this button opens a modal dialog for entering the description of the point. It has OK and Cancel buttons titled 'OK' and 'Avbryt'.

On pressing OK, the current location is stored to the database. Store precision_meters according to the current indicated precision of the location data received by the device.

## Displaying stored points

When loading the page, fetch all of the logged-in user's stored points from the database. Draw this on the map, if they're visible in the current viewport, and make sure they're drawn on top of any loaded orienteering map overlay.

Display each point with an appropriate SVG marker and the text of the marker below. Only draw the text below a certain zoom level (we will adjust this zoom level during testing. The distance between stored points might be on the order of tens to hundreds of meters).

You should of course also show points that have newly been created, and implement this in a way that updates the text of any points edited in the current session.

## Editing stored points

If pressing directly on a stored point, open a context menu with the options 'Rediger' and 'Slett'. Rediger pops up a modal dialog to edit the description of the point (with OK/Avbryt buttons). 'Slett' deletes the point.

Confirmation behavior for deletion is that the 'Slett' option changes to red text saying 'Er du sikker på at du vil slette merket?' when pressed, and deletes the point (and closes the context menu) on a second press. This confirmation text re-sets when the context menu is closed. The context menu is closed by pressing anywhere not inside it.

