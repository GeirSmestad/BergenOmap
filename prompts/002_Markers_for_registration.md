# Implementing markers for registration

I want to change how coordinates are collected when clicking on the mapView and overlay (the first being a Leaflet controller, the latter being an image).

Coordinates are currently collected one-by-one when clicking the map or image, round-robin. This is cumbersome and error-prone.

I wish instead for the current click events that do coordinate collection to be replaced with events that place a *marker* at the clicked location. The markers can be moved around by dragging them. There will (for now) be three markers for each of the two views: One red, one yellow and one blue. Each of these corresponds to one of the coordinates that would previously be collected by clicking, and the utilization of these coordinates in the rest of the app should behave as before.

You can use a typical "teardrop-type" map marker, which is both easy to move and denotes a precise location. Note that the location it collects must in fact correspond to the "sharp" end of the marker; we don't want the user to be confused by the collected coordinate happening a different place than visually indicated.

The markers should be placed round-robin, and no further markers should appear if the user clicks when all three (for the current view) are placed. Right-clicking a marker should remove it, and the next click should place the same-colored marker again. (This behavior is pretty much round-robin, as before).

Please plan out how to implement this feature in a clean and maintainable manner, using idiomatic ES that extends the structure that already exists for the registerMap feature.

In the future, we might want to allow more than three markers, allow the users to "select" the marker to place from a tray of some sort, and implement an otherwise unrelated zooming feature for the overlay image. Don't write any code for this right now, I am just informing you about this in case it affects your decision on how to implement my feature.