# BergenOmap

Orienteringskart for Bergen, med GPS.


# Notater

For å kjøre server for back-end:

C:\source\O-maps\backend>python Backend.py

Denne tjener først og fremst registerMap.html, for å registrere nye kart. Se kildekode for liste med endepunkter.

# TODO

## Registrering av kart



* Støtt transformering av PDF til PNG når du drag-and-dropper en PDF i registreringsvinduet
* Preload Map name og Filename i registrerings-vindu når du drag & dropper en kartfil
* Må få inn JSON med metadata for kart: Dato, område, event, løype, kart-tegner, kart-klubb, løypelegger

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

## Navigasjons-app

* Cache Leaflet-filer, orienteringskart og kart-definisjoner lokalt i appen i tilfelle brudd i nettverk
* Sentrer kartet på brukerens posisjon (knapp)
* Kartet følger brukerens posisjon (toggle av/på)
* Kartet orienteres etter retningen man holder mobilen (toggle av/på)
* Zoom-innstilling som finner mobil-dimensjoner og setter zoom til å tilsvare kartets målestokk

* (X) Hosting, som eksponerer appen på twerkules.com
* (X) Flere kart på en gang (generalisert, basert på en liste som kommer som parameter)
* (X) Velge hvilke(t) kart man vil se, når det er flere å velge mellom (fx. ikke laste før du klikker på kart-området)  
* (X) GPS-posisjon vises på kartet
* (X) Visning hvor kart er satt til korrekt posisjon med 0% opacity

## Infrastruktur

* Deploy-skript som genererer kart og kopierer filer til S3. Alternativ for å overskrive eksisterende kart.
* Serving av kart via DB-grensesnitt, så man slipper å tenke på filsystem

* Strukturere web-kode i moduler

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

## Generelle forbedringer

* Lagre kun 6 desimaler i koordinater i DB ved registrering

* Få inn merker i tre farger for hvor man har klikket på kart og overlay ved registrering
* Funksjon for å re-generere final-bilder i database som webp
* Mulighet for å lagre kart som webp. Når DB inneholder koordinater, original og live, kan du re-generere live on-demand som webp.

* Registrer kart på nytt, til database, som du nå kan arkivere en lang-levd kopi av

* Beskjed i registrerings-grensesnitt om framdrift ved registrering ("Beregner registrering / overfører bilder / ferdig")

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

## Bugs

* Blåmannen-kartet "Blamannen-10k-rotates-weirdly.png" får rar rotasjon med følgende valg av koordinater: pixel [[774, 801.1508060817264], [2241.0588235294117, 2521.637535001242], [868.4313725490196, 3591.038093645571]], realworld [[60.41528220065873, 5.347149968147278], [60.403055906622484, 5.371466875076295], [60.3942598294791, 5.351312756538392]].

* (X) Fiks exceptions som skjer når du åpner database-visning
* (X) Backend sender nå felt-navnet "filename" i stedet for "map_filename" ved registrering (som gjør at map.html ikke finner den)++

## Langsiktige ambisjoner

* Menysystem hvis appen begynner å bli komplisert; ha flere funksjoner
* Menysystem for å velge flere kart, hvis de overlapper i terrenget
* Kjøre selv-hostet instans av OpenStreetMap i container; la appen hente kart fra denne
* Funksjon for å registrere/stemple poster når man er ute og trener på et gammelt kart
* Mobilvennlig layout og funksjonalitet for kart-registrering (omfattende task, inkl. zoom og markører på bilder + mobilvennlig layout & navigasjon)
* Automatisk identifikasjon av start/mål, poster, målestokk, postbeskrivelser, kart-areal via bildeanalyse med AWS, og utregning av GPS-koordinater for poster
* Vise Strava-track i registrert kart
* Logge track

* Kjør back-end i container som hostes på ECC og kobles mot S3
* Støtt direkte kobling mellom kartvisning og database i container
* Et mer ordentlig system for hosting og deploy, når det blir nødvendig
* Deploy-script som setter opp all infrastuktur med én kommando

* Kreditere kart-tegneren i grensesnittet, kanskje på placeholder-bildene før kartet lastes
* (X) Årstall for kart i JSON-format [dette går i attribution-feltet]



## Notater

Jeg har custom-innstillinger for cache under Behaviors i CloudFront og Edit Metatada i S3. De er kortlevde.

Handlinger som trengs for å registrere et nytt kart:

* Finn kartfil
* Hvis PDF, konverter den til PNG i høy oppløsning
* Putt PNG i en katalog hvor MapTransform.py kan nå den
* Legg inn URL for kart med marger men null rotasjon i registerMap.html
* Gjør kartregistrerings-prosessen, generer JSON
* Lim JSON-datastruktur inn i mapBrowser.js
* Gjør kall til MapTransform.py og sett inn korrekt rotasjon fra registrerings-JSON
* Lagre denne kartfilen på en plass hvor webserveren kan servere den
* Legg inn filnavnet på filen i JSON-datastruktur i mapBrowser.js

Det er litt som må gjøres for å få denne prosessen helt smooth.

Helst burde brukeren få velge kartfil (URL eller drag-and-drop), gjøre registrerings-prosessen,
fylle ut kartnavn og metadata og trykke "registrer" -> alle data lagres i database som nå er
umiddelbart tilgjengelig fra maps.html.

Implementasjon så langt:

 * (X) Motta bildefil til server med drag'n'drop

 * Støtt transformering av PDF
 
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
 
 

 ## Python-pakker jeg bruker:

 * flask
 * flask_cors
 * pillow
 * numpy
 * scipy