# BergenOmap

Orienteringskart for Bergen.


# Notater

For å kjøre server for back-end:

C:\source\O-maps\backend>python MapTransform.py

Leverer kart-rotasjoner på endepunkt http://127.0.0.1:5000/transform?angle=20&border=300.


# TODO

## Registrering av kart


* Lag scraper for å hente og sortere alle kartene fra o-bergen
* Lag programvare for å slå disse kartene sammen til (post-frie) kart man kan bruke i terrenget
* Lag grensesnitt for å plassere kartet riktig, basert på algoritme
* Ideelt sett mulighet for å lagre dette info om registrering til database, så lagringen av denne infoen går fortere

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

* Velge hvilke(t) kart man vil se, når det er flere å velge mellom
* Hosting, som eksponerer appen på twerkules.com
* Flere kart på en gang
  
* (X) GPS-posisjon vises på kartet
* (X) Visning hvor kart er satt til korrekt posisjon med 0% opacity

## Infrastruktur

* Databasesystem for lagring av kart-filer og deres registrerte posisjon. DynamoDB, SQLite eller AWS-SQLdatabase? (Trenger kanskje SQL hvis jeg skal ha relasjoner)
* Strukturere web-kode i moduler
* Se om det er mulig å komprimere kart-filene og samtidig beholde gjennomsiktige marger. Lossless PNG-filer er veldig store.
* Javascript for å be nettleseren ikke sette låse telefonen ved inaktivitet

## Generelle forbedringer

* Ikke bruke 'alert' ved feil i mottak av GPS-posisjon; det er veldig in-your-face

## Langsiktige ambisjoner

* Menysystem hvis appen begynner å bli komplisert; ha flere funksjoner
* Funksjon for å registrere/stemple poster når man er ute og trener på et gammelt kart
* Automatisk identifikasjon av start/mål og poster, via bildeanalyse med OpenAI, og utregning av GPS-koordinater for disse
* Vise Strava-track i registrert kart
* Et mer ordentlig system for hosting og deploy, når det blir nødvendig
* Kreditere kart-tegneren



## Notater

Output fra registrering, for test av at refaktorering henger på greip:

>>> getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, width, height)
Optimal input number: 3.2224726220246245
{'nw_coords': (60.40845319707709, 5.33672273549868), 'se_coords': (60.386702210916575, 5.370807726609491), 'optimal_rotation_angle': 3.2224726220246245}
>>>

