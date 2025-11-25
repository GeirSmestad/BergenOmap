# BergenOmap

Orienteringskart for Bergen, med GPS-støtte for oppdagelsesferd i fremmed skog.


# Notater

For å kjøre server for back-end:

C:\source\O-maps\backend>python Backend.py

# TODO

## Registrering av kart

* Legg inn knapp for å bytte mellom satellittfoto og Norgeskart i Leaflet
* Legg til checkbox som lar deg registrere kartet til database hvis du leser inn registreringen fra JSON

* Grensesnitt for å redigere metadata i databasen uten å røre kart-registreringen

* Støtt transformering av PDF til PNG når du drag-and-dropper en PDF i registreringsvinduet
* For registrering i bedriftscuppen, bør jeg ha et verktøy som raskt lar meg sette samme registrering på identiske kart
* + lagre metadata fra mappestruktur. Trenger bare å få det ustrukturert inn i databasen; kan ta detaljene med AI-modell senere.

* (X) Milepæl, registrering av kart er nå ganske enkelt! Kommet langt siden jeg måtte sjonglere filer og JS-definisjoner :)
* (X) Bedre ergonomi ved velging av 3+3 punkter, helst ved å både kunne se orienteringskart og Leaflet ved siden av hverandre
* (X) Koble den nye algoritmen opp til knappen som registrerer alt i databasen; her er det en bug
* (X) Mer pålitelig algoritme for å registrere kart, må også ta høyde for "forstørr-og-roter"-behovet som kommer fra Leaflet
* (X) Output hvilken feil algoritmen regnet ved registrering
* (0) Du kan gjerne putte denne i databasen ved registrering
* (X) Mer presis muspeker i Leaflet-kart, for presis registrering
* (X) Preload Map name og Filename i registrerings-vindu når du drag & dropper en kartfil
* (X) Må få inn JSON med metadata for kart: Dato, område, event, løype, kart-tegner, kart-klubb, løypelegger
* (X) Knapp for å dumpe kartfiler og kart-definisjoner i javascript fra DB til disk
* (X) Knapp for å skru av og på forhåndsvisning registrert kart i registrerings-app
* (0) Lag programvare for å slå disse kartene sammen til (post-frie) kart man kan bruke i terrenget
* (X) Helhetlig integrert grensesnitt for behandling av bildefil og registrering av kart
* (X) Ideelt sett mulighet for å lagre info om registrering til database, så registrering av nye kart går fortere
* (X) Lag scraper for å hente og sortere alle kartene fra o-bergen
* (X) Lag grensesnitt for å plassere kartet riktig, basert på algoritme
* (X) Standardiser marger på overlay som en prosent av lengste dimensjon (13% per side er rimelig)
* (X) Lag enkel software for å konvertere PDFer og fjerne magenta-linjer
* (0) Estimer kart-dimensjoner med høyde for mine selvpåførte marger
* (X) Legg inn nytt og mer detaljert kart
* (0) Lag justerbar gjennomsiktighet for overlay
* (0) Preload +/- 5 grader rotasjon fra back-end
* (X) Lag algoritme for rotasjon og plassering av overlay
* (X) Beregn matematikken for å klikke på bilde og kart for å regne ut riktige koordinater
* (0) Fiks system for å dra et punkt på O-kartet til å matche ekte-kartet
* (X) Fiks system for å rotere kart
* (X) Regn ut koordinater for kart basert på dimensjon og målestokk for A4-kart
* (X) Bytt checkboks til å resize kart og beholde forhold mellom X- og Y-dimensjon
* (X) Motta bildefil til server med drag'n'drop
* (X) Transformer bildefil på server til kart med gjennomsiktige marginer og null rotasjon
* (X) Send respons tilbake til server
* (X) Sett dimensjons-velgeren til bildet du har sendt
* (X) (la brukeren gjøre registreringsprosessen)
* (X) Få opprinnelig bildefil tilbake til server (sånn at den kan roteres til rett vinkel)
* (X) Roter opprinnelig bilde til vinkel spesifisert av registreringsprosess
* (X) Sett inn bilde-filnavn og andre innhentede data i JSON-datastruktur
* (X) Send JSON-datastruktur til server 
* (X) Lagre rotert bilde på server
* (X) Eventuelt med kartnavn og annen metadata spesifisert i registrerings-vinduet
* (X) Sørg for at filer/filnavn og JSON-data kan hentes inn i mapBrowser.js


## Navigasjons-app

* Cache Leaflet-filer, orienteringskart og kart-definisjoner lokalt i appen i tilfelle brudd i nettverk (Cache Storage API?)

* Sentrer kartet på brukerens posisjon (knapp)
* Kartet følger brukerens posisjon (toggle av/på)
* Kartet orienteres etter retningen man holder mobilen (toggle av/på)
* Zoom-innstilling som finner mobil-dimensjoner og setter zoom til å tilsvare kartets målestokk

* Mulighet for å vise Strava-track
* Database-integrasjon for å samle en brukers informasjon (fx. GPX-filer fra Strava)


* Kanskje med en toggle-knapp øverst for å følge posisjonen til brukeren?

* Kanskje prøve ut om det finnes en måte å vise på oversiktskartet hvilke kart som er tilgjengelige.
* Vise en liste over alle kart som er tilgjengelige på posisjonen kartet er satt

* Skru av live oppdatering av posisjons-visning når du simulerer posisjon, ellers spretter den tilbake
* Kanskje en debug-mode som gjør det lettere å velge simulert posisjon på kartet?

* (X) Prøv med sentrering på nåværende posisjon første gang du laster siden.
* (X)Bedre grensesnitt for valg av kart. Full liste, sorter på avstand, vis kartene for nåværende posisjon, rask toggle mellom dem.
* (X) Hosting, som eksponerer appen på twerkules.com
* (X) Flere kart på en gang (generalisert, basert på en liste som kommer som parameter)
* (X) Velge hvilke(t) kart man vil se, når det er flere å velge mellom (fx. ikke laste før du klikker på kart-området)  
* (X) GPS-posisjon vises på kartet
* (X) Visning hvor kart er satt til korrekt posisjon med 0% opacity

## Infrastruktur


* Strukturere web-kode i moduler
* På et tidspunkt vil jeg kanskje ha en indeks-primærnøkkel heller enn å bruke kartnavnet, pga. mange kart i samme område
* Database-nøkkel som gir versjonen av et bestemt kart, slik at jeg kan cache i nettleseren til brukeren

* (X) Deployment på EC2/Lightsail
* (X) Scanne alle O-kartene mine som ikke er fra bedriftscup
* (X) Laste ned 2025-kartene fra bedriftscup (bruk script)
* (0) Deploy-skript som genererer kart og kopierer filer til S3. Alternativ for å overskrive eksisterende kart.
* (X) Serving av kart via DB-grensesnitt, så man slipper å tenke på filsystem
* (X) Koble på og justere "dump database-funksjon" så filene kommer inn i AWS-katalogen og brukes direkte av kart-appen
* (X) Bruke DB uten server: Kommando som dumper definisjoner og kartfiler fra DB -> disk, for rask kopiering til AWS (se under)
* (X) MapDefinitions.py -> Database (også med kart/bilder) -> kartfiler på disk + mapDefinitions.js som leses av mapBrowser.js
* (X) Må lagre detaljene om de 6 koordinatene i DB ved registrering, så jeg kan rekonstruere registreringen i ettertid
* (X) Legge til multiline-tekstfelt i database for credits for kart
* (X) Database-lagring av kartfiler
* (X) Nytt web-grensesnitt for å bla i databasen. Dette kan du sikkert få ut fra én ChatGPT-prompt.
* (X) Se om det er mulig å komprimere kart-filene [webp 70% gir 50% mindre fil med OK kvalitetstap. Bør helst gjøres via config.]
* (X) Database for kart-registreringer (sqlite)
* (X) Javascript for å be nettleseren ikke sette låse telefonen ved inaktivitet

## Scanning og registrering av spesifikke kart


* Registrere alle kartene som ikke er fra bedriftscuppen (mappe O-kart under Scans)
* Registrere alle tur-orienteringskartene

* Registrere bedriftscup-kart 2025
* Registrere resten av bedriftscup-kart

* (X) Jeg mangler løpene fra Dyreparken i 2024, vet ikke hvor de kartene har blitt av.
* (X) Spor opp alle de gamle turorienterings-kartene dine, og få dem på listen over kart å registrere. Se på Gmail & Downloads
* (X) Legge inn "månedens kart november" på Skage, hvor jeg og C gikk lørdagstur
* (X) Scanne alle kart fra løp som ikke er bedriftscuppen, så jeg kan legge dem inn
* (X) Gamle turorienteringskart som kan lastes ned fra turorientering.no
* (X)Legge inn mine kart fra løp som mangler fra bedriftscuppens nettside i perioden jeg har løpt


## Generelle forbedringer

* Få inn merker i tre farger for hvor man har klikket på kart og overlay ved registrering
* Funksjon for å re-generere final-bilder i database som webp
* Mulighet for å lagre kart som webp. Når DB inneholder koordinater, original og live, kan du re-generere live on-demand som webp.

* Beskjed i registrerings-grensesnitt om framdrift ved registrering ("Beregner registrering / overfører bilder / ferdig"), kanskje en sticky status-bar

* (X) Fjern filnavnet fra viewDatabase-funksjonen; jeg trenger det ikke. Fjern også Attribution-feltet.
* (X) Det burde gå an å one-shotte en justering i registrerings-grensesnittet sånn at jeg lett kan putte inn de nye feltene jeg ønsker å lagre i databasen.
* (X) Lagre kun 6 desimaler i koordinater i DB ved registrering
* (X) Registrer kart på nytt, til database, som du nå kan arkivere en lang-levd kopi av
* (X) Slette filer som ikke er i bruk lenger, restrukturere appen så det relevante ligger i rot-katalogen
* (X) Refaktorere katalogene for database-eksport som lett-tilgjengelige konstanter øverst i Backend.py
* (X) Lagre pixel-koordinater fra registerImage.html til DB som int heller enn float; unødvendig å ta med desimalene.
* (X) Rename MapTransform.py til Backend.py; den inneholder nå en webserver som gjør mye forskjellig.
* (X) Rydd opp i database-innsetting i MapTransform-py, rename variabler til mer fornuftige navn++
* (X) Last ned alle de historiske kartene fra o-bergen
* (X) Python-script som laster ned alle kartene jeg er ute etter på en høflig måte
* (0) Kart-dimensjoner i metadata for kartet, så jeg kan bruke de dataene i appen [nei, henter dette fra kartfilen]
* (X) Parameterisert input av hvilket kart man skal registrere i registerMap.html
* (X) Ikke bruke 'alert' ved feil i mottak av GPS-posisjon; det er veldig in-your-face
* (X) Lagt til kart over Munkebotn
* (X) Lagt til kart over Åstveitskogen
* (X) Lagt inn Storerinden -- litt usikker på registreringen
* (X) Lagt til sprintkart på Bønes
* (X) Lagt til gammelt kart (2005-ish?) fra Midtfjellet
* (X) Lagt til Blåmannen


## Deployment

Opprett Lightsail-server med statisk IP. Legg til firewall-regel for å tillate port 443 (HTTPS)

Sett opp SSH-config i ~\.ssh\config, med følgende innhold (og ha pem-nøkkel i samme mappe):

Host bergenomap
    HostName 54.220.213.9
    User ubuntu
    IdentityFile ~/.ssh/LightsailDefaultKey-eu-west-1.pem

Koble til web-server:
  ssh -i ~/.ssh/LightsailDefaultKey-eu-west-1.pem ubuntu@54.220.213.9
Kopier bootstrap-script:
  scp -i ~/.ssh/LightsailDefaultKey-eu-west-1.pem .\bootstrap.sh ubuntu@54.220.213.9:~
Kjør bootstrap-script (merk: må ha LF line-endings):
  chmod +x ~/bootstrap.sh
  ./bootstrap.sh

Kopier app til server:
  cd C:\Source\BergenOmap
  scp -r * bergenomap:/srv/bergenomap/

Installer Python-pakker på server:
  cd /srv/bergenomap
  /srv/bergenomap/venv/bin/pip install -r requirements.txt

Start backend-server:
  sudo systemctl start bergenomap

Sjekk i loggene at appen starter opp:
  journalctl -u bergenomap -f

Se etter web-feil i logger:
  sudo tail -f /var/log/nginx/access.log
  sudo tail -f /var/log/nginx/error.log

Re-deploy app når du har endret kode:
  rsync -avz --exclude data/database.db ./ bergenomap:/srv/bergenomap/
  ssh bergenomap "sudo systemctl restart bergenomap"

Hvis du ikke får rsync til å fungere, deploy filene og mappene du trenger med scp:
  scp -i ~/.ssh/LightsailDefaultKey-eu-west-1.pem -r `
    *.html `
    js `
    css `
    backend `
    ubuntu@54.220.213.9:/srv/bergenomap/
  ssh bergenomap "sudo systemctl restart bergenomap"


## Kart-kilder -- flyfoto og topografiske kart

Den Kartverket-tjenesten jeg har benyttet meg av, støtter følgende kilder:

https://cache.kartverket.no/v1/wmts/1.0.0/europaForenklet/default/webmercator/{z}/{y}/{x}.png - grovt Europa-kart
https://cache.kartverket.no/v1/wmts/1.0.0/toporaster/default/webmercator/{z}/{y}/{x}.png - høy-kontrast raster
https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png - detaljert topografisk (min standard)
https://cache.kartverket.no/v1/wmts/1.0.0/sjokartraster/default/webmercator/{z}/{y}/{x}.png - sjøkart-raster
https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png - svart-hvitt topografisk

Usikker på om dette lar seg implementere i Leaflet på en måte som er kompatibel med det jeg har bygget til nå, men det ville være dritfett:
Å kunne switche mellom flyfoto og topografisk kart ville gjøre manuell registrering enklere.

Se diskusjon med chatbotten: https://chatgpt.com/share/69239302-0f0c-8000-a610-abdb9d3be08e

Kartverket / Norge i bilder tilbyr web service for flyfoto til ikke-kommersiell bruk. Se spesifikasjoner her:

https://kartkatalog.geonorge.no/metadata/norge-i-bilder-wmts-euref89-utm33/072662f8-41c9-4e9a-a55a-343dee0c3f84 - Euref89 UTM33 (Østlandet)
https://kartkatalog.geonorge.no/metadata/norge-i-bilder-wmts-euref89-utm32/2222a1d6-3225-43d7-806c-2c61a8328229 - Euref89 UTM32 (Vestlandet)
https://kartkatalog.geonorge.no/metadata/norge-i-bilder-wmts-mercator/d639038c-a75b-446a-ad0c-16301cabfd21 - Mercator

XML-spesifikasjoner er henholdsvis:

http://opencache.statkart.no/gatekeeper/gk/gk.open_nib_utm33_wmts_v2?SERVICE=WMTS&REQUEST=GetCapabilities
https://opencache.statkart.no/gatekeeper/gk/gk.open_nib_utm32_wmts_v2?SERVICE=WMTS&REQUEST=GetCapabilities
https://opencache.statkart.no/gatekeeper/gk/gk.open_nib_web_mercator_wmts_v2?SERVICE=WMTS&REQUEST=GetCapabilities

ChatGPT påstår at Leaflet støtter CRS (coordinate reference system) for UTM hvis jeg bruker pakkene Proj4Leaflet og WMTS (Web Map Tile Service).

Ha! Amazing!! Jeg kan bruke Mercator-tjenesten (nederst) og den gir et fungerende kart av flyfoto. Usikker på registreringen. 
Slik legger du den til i min Leaflet-plugin:

var map = L.map('registrationMapBrowser').setView(startLatLon, 15);
L.tileLayer(
  'https://opencache{s}.statkart.no/gatekeeper/gk/gk.open_nib_web_mercator_wmts_v2' +
  '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=Nibcache_web_mercator_v2' +
  '&STYLE=default' +
  '&FORMAT=image/jpgpng' +
  '&tileMatrixSet=default028mm' +
  '&tileMatrix={z}&tileRow={y}&tileCol={x}',
  {
    subdomains: ['', '2', '3'],
    attribution: '© Norge i bilder / Kartverket, Geovekst m.fl.',
    maxZoom: 19
  }).addTo(map);

Credit til ChatGPT for å ha foreslått å snakke med tjenesten på den måten.

En dag kan du sende en melding til teknisk og faglig kontakt i Kartverket og takke for at dette er tilgjengelig.
Faglig kontakt - hardy.buller@kartverket.no
Teknisk kontakt - trond.ola.ulvolden@kartverket.no 


## Bugs

* (X) Blåmannen-kartet "Blamannen-10k-rotates-weirdly.png" får rar rotasjon [løst med ny algoritme]
* (X) Fiks exceptions som skjer når du åpner database-visning
* (X) Backend sender nå felt-navnet "filename" i stedet for "map_filename" ved registrering (som gjør at map.html ikke finner den)

## Langsiktige ambisjoner

* Menysystem hvis appen begynner å bli komplisert; ha flere funksjoner
* Menysystem for å velge flere kart, hvis de overlapper i terrenget

* Innsending av database-kart + kjente metadata til AI-modell for setting av metadata i database
* Funksjon for å registrere/stemple poster når man er ute og trener på et gammelt kart
* Maskinlærings-system for å identifisere post-posisjoner på registrerte kart og regne disse om til ekte koordinater
* Databasetabell for å støtte post-plasseringer på kart og posisjonene deres i virkeligheten

* Mobilvennlig layout og funksjonalitet for kart-registrering (omfattende task, inkl. zoom og markører på bilder + mobilvennlig layout & navigasjon)
* Vise Strava-track fra GPX-fil i registrert kart
* Logge track

* Kreditere kart-tegneren i grensesnittet, kanskje på placeholder-bildene før kartet lastes

* (X) Et mer ordentlig system for hosting og deploy, når det blir nødvendig
* (X) Deploy-script som setter opp all infrastuktur med én kommando [nært nok med bootstrap + scp]
* (0) Automatisk identifikasjon av start/mål, poster, målestokk, postbeskrivelser, kart-areal via bildeanalyse med AWS, og utregning av GPS-koordinater for poster
* (0) Kjør back-end i container som hostes på ECC og kobles mot S3 [dette skal jeg gjøre på en mer pragmatisk måte]
* (0) Støtt direkte kobling mellom kartvisning og database i container [løst ved å la back-end serve kart rett fra DB]
* (0) Kjøre selv-hostet instans av OpenStreetMap i container; la appen hente kart fra denne [løst med Kartverkets server]
* (X) Årstall for kart i JSON-format [dette går i attribution-feltet]



## Notater

Jeg har custom-innstillinger for cache under Behaviors i CloudFront og Edit Metatada i S3. De er kortlevde.

 
 

 ## Python-pakker jeg bruker:

 * flask
 * flask_cors
 * pillow
 * numpy
 * scipy
 * traceback