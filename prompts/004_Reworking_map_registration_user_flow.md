# Reworking map registration user flow

We will now re-work the user flow when registering maps.

Right now, the user clicks "Process selected registration" after selecting coordinates and entering metadata, and the registration from selected coordinates is computed directly and stored to database. The user then uses the registration preview to see if the fit was good. If it was not, he must adjust the coordinates and repeat the process.

I want to make this a two-step process. Add a new button titled "Compute registration" that does everything in "Process selected registration" apart from storing the registration (and metadata) to the database. Once the registration is computed, it must show the registration preview by toggling it on.

Clicking this button again must repeat the process, showing the updated preview.

Add a second button, titled "Save map", which stores the (latest, of course, we ignore the previous ones) registration with metadata to the database.
