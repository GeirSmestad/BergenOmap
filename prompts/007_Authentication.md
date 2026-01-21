# Authentication

I want to add some rudimentary authentication to my web server. The app currently allows anyone to access it, and I want to restrict it just a tiny bit.

I want a very simple form when the user first visits omaps.twerkules.com, which says 

"For å logge inn, skriv fullt navn på personen som har laget appen
(du er veldig veldig velkommen til å bruke den!)"

And a button saying "Logg inn".

Make this form tasteful, simple and good-looking both on mobile and desktop sizes.

I want successful login to set a session cookie valid for 1 year, and which will make the web server serve any of its HTML pages.

You can create a session database table, I want fields for both date_set and session_key. Have a username field as well; long-term I want to link it to the users table. (You can use the default geir.smestad user for now).

Note that I don't serve pages through my Python back-end; they are served through nginx as stated in bootstrap.sh. If it's simple to do so, block back-end calls as well unless the user is authenticated. Keep in mind that server changes need to be reflected in bootstrap.sh, and you need to tell me what to do in order to update my existing server. Ditto for database changes.

Ask me clarifying questions if required.
