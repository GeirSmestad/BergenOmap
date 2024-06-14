# BergenOmap

Orienteringskart for Bergen, med GPS..


# Notater

For å kjøre server for back-end:

C:\source\O-maps\backend>python MapTransform.py

Leverer kart-rotasjoner og registrering av et O-kart, basert på 3 x 2 sett matchende koordinater.


# TODO

## Registrering av kart


* Lag scraper for å hente og sortere alle kartene fra o-bergen
* Lag programvare for å slå disse kartene sammen til (post-frie) kart man kan bruke i terrenget
* Ideelt sett mulighet for å lagre dette info om registrering til database, så lagringen av denne infoen går fortere

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

* Velge hvilke(t) kart man vil se, når det er flere å velge mellom (fx. ikke laste før du klikker på kart-området)
* Hosting, som eksponerer appen på twerkules.com
* Flere kart på en gang (generalisert, basert på en liste som kommer som parameter)
  
* (X) GPS-posisjon vises på kartet
* (X) Visning hvor kart er satt til korrekt posisjon med 0% opacity

## Infrastruktur

* Databasesystem for lagring av kart-filer og deres registrerte posisjon. DynamoDB, SQLite eller AWS-SQLdatabase? (Trenger kanskje SQL hvis jeg skal ha relasjoner)
* Strukturere web-kode i moduler
* Se om det er mulig å komprimere kart-filene og samtidig beholde gjennomsiktige marger. Lossless PNG-filer er veldig store. webp?
* (X) Javascript for å be nettleseren ikke sette låse telefonen ved inaktivitet

## Generelle forbedringer

* Parameterisert input av hvilket kart man skal registrere i registerMap.html
* Få inn merker i tre farger for hvor man har klikket på kart og overlay ved registrering
* (X) Ikke bruke 'alert' ved feil i mottak av GPS-posisjon; det er veldig in-your-face
* (X) Lagt til kart over Munkebotn

## Langsiktige ambisjoner

* Moving map; javascript-event som følger posisjonen din uten å endre zoom. Kanskje med innstilling av/på.
* Menysystem hvis appen begynner å bli komplisert; ha flere funksjoner
* Funksjon for å registrere/stemple poster når man er ute og trener på et gammelt kart
* Automatisk identifikasjon av start/mål og poster, via bildeanalyse med OpenAI, og utregning av GPS-koordinater for disse
* Vise Strava-track i registrert kart
* Et mer ordentlig system for hosting og deploy, når det blir nødvendig
* Kreditere kart-tegneren
* Årstall for kart i JSON-format



## Notater

