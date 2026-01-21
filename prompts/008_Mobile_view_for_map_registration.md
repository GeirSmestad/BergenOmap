# Mobile view for map registration

registerMap now has very decent UX on laptop/desktop. I don't want to change anything on those screen sizes, maybe except the possibility of adding the overlay map with a file picker as an optional alternative to drag & drop. (This would be necessary on mobile, and has not yet been implemented).

However, for mobile users, the current page layout doesn't work. It needs to be modified, as far as I can tell to a layout that somehow uses tabs or similar interaction. Many of the map registration actions requires focusing on different UI elements that need to take up most of the mobile screen while the interaction takes place.

As a recap, registering or editing a map registration works as follows:

1. Upload a new orienteering map overlay to register (or alternatively, choose an existing set of registration data to edit, after which the user will choose which of the now-optional steps below to perform)
2. Place three map markers on the overlay and three in the real terrain map, that match pairwise. During this process, the user will have to switch between the two map views, likely pan & zoom inside them and create and move map markers.
3. Ask the app to compute a registration
4. Inspect whether the registration works, and maybe repeat steps 2 & 3
5. Optionally edit the metadata of the map
6. Store the finished registration

The picker for overlay upload or existing registration would only need to be visible for step 1.
The registration-map-controls would have to be available for steps 2-6
And probably the registrationStatus bar as well; for steps 2-6. Maybe 1, if we adjust its contents.

And a reasonable demarcation of views would then be (a) upload overlay or choose existing registration, (b) terrain map + marker palette, (c) overlay map + marker palette, (d) metadata editor. 

My idea for how to implement this would be a tab selector that only appears at mobile & tablet sizes, which chooses which of the views a/b/c/d to currently display for most of the mobile screen, with status bar and registration-map-controls visible in the views that require them (potentially all).

For simplicity, assume that you don't have to implement pan & zoom interaction for overlayView, although this will be implemented later.

How would this mobile layout best be implemented, in a way that is clean and maintainable, and ideally has some flexibility for experimenting with exactly how the different divs are displayed?

I am open to creating a whole separate HTML page for this if necessary, and navigating based on device type. If device-specific media queries and some small helper JS is insufficient in preserving maintainability.

Start by investigating my suggested solution, and suggest a different one if a better solution seems likely. Think about how the flow and user experience on mobile will feel.

Make a plan for a good way to solve this.

## Follow-up 1

This is very good. I also want the content of the various tab views to fill out the remaining space on the screen -- the user shouldn't have to scroll the *page itself* in any of the tabs. The exceptions to this are the metadata page (where it might be necessary due to the number of data fields) and of course the content of preExistingMapSelector (which will be arbitratily long).

The emphasis will be plenty of space for the map views, but we will manually adjust the relative dimensions of the content after you've implemented it, in response to testing

## Follow-up 2

drop-area should not be visible for mobile dimensions at all. To make the equivalent functionality available on mobile, add another div containing a button identical to Select File, which is visible only on mobile. It should trigger the exact same JS as the existing button.
