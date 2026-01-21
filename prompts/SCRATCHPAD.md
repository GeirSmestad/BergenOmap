- You have to add a map_scale field to the maps table




-debugging: skriv ut data som kommer fra bildet til konsoll
-vi vil teste dette via scriptet du har laget

-We will test this via manually running the script you've written, so make sure it's easily runnable in the terminal
-For debugging via this script, add an option that outputs an image with text regions marked and the text outputted to console. This seems a likely source of error and fine-tuning.
-It must be easy to comment in our out this full suite of functionality where it is performed on newly saved maps. Leave it commented out here initially; this feature must be tuned before deployment.
-The direct API integration with OpenAI must not be exposed to the web, as it potentially exposes paid API calls
- OpenAI API key should be stored in the internal_kv database
- Assume DB migrations have been run. Don't add defensive code to accept DB schemas with or without the new keys; unchecked exceptions are allowed.
