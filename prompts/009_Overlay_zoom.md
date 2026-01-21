# Overlay zoom

I need zooming and panning functionality in the overlayView img tag. Any coordinate markers that have been placed need to follow the panning and zooming, behave correctly when leaving the currently visual region due to zooming, and still provide the correct coordinates (with regards to the un-panned, un-zoomed image) when the app reads them. Placing coordinate markers must be possible when the view is zoomed, and they must correctly report the image coordinates they are placed at even if the *view* is zoomed or panned.

The behavior needs to take into account that the "click", or maybe alternatively "mouse up" or "release press" events are required for placing the coordinate markers on the image, and that coordinate marker dragging needs to not have adverse interaction with the panning and zooming behavior.

Suggest any solution that achieves the desired result in a clean and maintainable way. Ask clarifying questions if required.

I am thinking pinch-to-zoom on mobile, and scroll-wheel to zoom in and out if a mouse is present. There should obviously be minimum (normal 100% size) and maximum zoom levels.

The feature is not critical to non-mobile widths, so if required due to complexity, it is premissible to choose a solution that will not be available for bigger devices.
