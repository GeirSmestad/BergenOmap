# BergenOmap

Orienteringskart for Bergen, med GPS.


# Notater

For å kjøre server for back-end:

C:\source\O-maps\backend>python MapTransform.py

Leverer kart-rotasjoner og registrering av et O-kart, basert på 3 x 2 sett matchende koordinater.


# TODO

## Registrering av kart



* Lag programvare for å slå disse kartene sammen til (post-frie) kart man kan bruke i terrenget
* Ideelt sett mulighet for å lagre dette info om registrering til database, så lagringen av denne infoen går fortere

* Helhetlig integrert grensesnitt for behandling av bildefil og registrering av kart

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


* Database-lagring av kartfiler
* Strukturere web-kode i moduler

* Må lagre detaljene om de 6 koordinatene i DB ved registrering, så jeg kan rekonstruere registreringen i ettertid
* Legge til multiline-tekstfelt i database for credits for kart

* (X) Se om det er mulig å komprimere kart-filene [webp 70% gir 50% mindre fil med OK kvalitetstap. Bør helst gjøres via config.]
* (X) Database for kart-registreringer (sqlite)
* (X) Javascript for å be nettleseren ikke sette låse telefonen ved inaktivitet

## Generelle forbedringer


* Rename MapTransform.py til Backend.py; den inneholder nå en webserver som gjør mye forskjellig.
* Få inn merker i tre farger for hvor man har klikket på kart og overlay ved registrering

* (X) Last ned alle de historiske kartene fra o-bergen
* (X) Python-script som laster ned alle kartene jeg er ute etter på en høflig måte
* (0) Kart-dimensjoner i metadata for kartet, så jeg kan bruke de dataene i appen [nei, henter dette fra kartfilen]
* (X) Parameterisert input av hvilket kart man skal registrere i registerMap.html
* (X) Ikke bruke 'alert' ved feil i mottak av GPS-posisjon; det er veldig in-your-face
* (X) Lagt til kart over Munkebotn
* (X) Lagt til kart over Åstveitskogen
* (X) Lagt inn Storerinden -- litt usikker på registreringen

## Langsiktige ambisjoner

* Menysystem hvis appen begynner å bli komplisert; ha flere funksjoner
* Menysystem for å velge flere kart, hvis de overlapper i terrenget
* Kjøre selv-hostet instans av OpenStreetMap i container; la appen hente kart fra denne
* Funksjon for å registrere/stemple poster når man er ute og trener på et gammelt kart
* Automatisk identifikasjon av start/mål, poster, målestokk, postbeskrivelser, kart-areal via bildeanalyse med AWS, og utregning av GPS-koordinater for poster
* Vise Strava-track i registrert kart
* Logge track
* Et mer ordentlig system for hosting og deploy, når det blir nødvendig
* Kreditere kart-tegneren, kanskje på placeholder-bildene før kartet lastes
* Årstall for kart i JSON-format



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
 * (la brukeren gjøre registreringsprosessen)
 * Få opprinnelig bildefil tilbake til server (sånn at den kan roteres til rett vinkel)
 * Roter opprinnelig bilde til vinkel spesifisert av registreringsprosess
 * Sett inn bilde-filnavn i JSON-datastruktur
 * Send JSON-datastruktur til server 
 * Lagre rotert bilde på server
 * Sørg for at filnavn og JSON-data kan hentes inn i mapBrowser.js
 * Eventuelt med kartnavn og annen metadata spesifisert i registrerings-vinduet
 