# Refactoring registerMap

I am going to expand registerMap with additional interactive features. Roughly summarized: 

-letting the user place interactive and movable pointers on both the Leaflet map and the overlayView, and using their position as the selected coordinates for registration
-zoomability on the overlayView image
-additional interaction buttons for previewing an on-going map registration
-controls for fine-tuning a registration by rotating, scaling and translating the preview image

However, registerMap.js now has a lot of functionality spread across a single JS file. I wish to perform a refactor that separates functionality into native ES modules (no build system please!) in a way that makes it easy and maintainable to add the features above. The goal is to make the page more maintainable, extendable and easy to understand. Pragmatism is the key factor.

Please consider this refactoring problem, and suggest how you would perform this refactor. What modules to create, how they should be connected to the base JS file and so on.