# Deciding architectural way forward for GPX viewer and training feature

This project currently contains a map registration app and a map viewer, intended for leisurly exploration of local forests with the help of GPS-connected orienteering maps. This works quite well.

I have refactored the map registration app into maintainable and extensible ES. I will eventually do the same with the map viewer, so assume that is done.

There are two more major parts of this project that I wish to implement. See the TODO lists under "GPX-viewer" and "Trenings-app". (They are in Norwegian). These are best described as distinct modes of the map viewer. They will share a lot of components with it, but the behavior and user workflows will be quite different.

The GPX viewer is for visually exploring historical GPX logs of orienteering races, in order to learn from mistakes. The training app is for simulating a race on a registered map, using GPX to keep track of visited control. Optionally timing.

Think about this for a bit, and reflect on the pros and cons of implementing the latter two modes as totally separate web pages, copying or re-using existing modules where appropriate and extending functionality where not. Versus extending mapBrowser.js directly, adding menu functionality for switching the UI between modes and keeping track of this via state (after the pattern of a single-page app)

My intuition says that separate pages is cleaner, but I'm not certain. Think about it and see if you have a clear recommendation one way or the other.
