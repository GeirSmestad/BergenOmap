# BergenOmap

Orienteringskart for Bergen.


# Notater

For å kjøre server for back-end:

C:\source\O-maps\backend>python MapTransform.py

Leverer kart-rotasjoner på endepunkt http://127.0.0.1:5000/transform?angle=20&border=300.


# TODO

## Registrering av kart

* Estimer kart-dimensjoner med høyde for mine selvpåførte marger
* Preload +/- 5 grader rotasjon fra back-end
* Lag justerbar gjennomsiktighet for overlay
* Lag grensesnitt for å plassere kartet riktig, basert på beregninger
* (X) Lag algoritme for rotasjon og plassering av overlay
* (X) Beregn matematikken for å klikke på bilde og kart for å regne ut riktige koordinater
* (0) Fiks system for å dra et punkt på O-kartet til å matche ekte-kartet
* (X) Fiks system for å rotere kart
* (X) Regn ut koordinater for kart basert på dimensjon og målestokk for A4-kart
* (X) Bytt checkboks til å resize kart og beholde forhold mellom X- og Y-dimensjon

## Navigasjons-app

* Visning hvor kart er satt til korrekt posisjon med 0% opacity
* GPS-posisjon vises på kartet
* Hosting, som eksponerer appen på twerkules.com
* Flere kart på en gang

## Infrastruktur

* Databasesystem for lagring av kart-filer og deres registrerte posisjon
* Strukturere kode i moduler

## Ambisjoner

* Vise Strava-track i registrert kart




## Notater

Output fra registrering, for test av at refaktorering henger på greip:

>>> getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, width, height)
Optimal input number: 3.2224726220246245
{'nw_coords': (60.40845319707709, 5.33672273549868), 'se_coords': (60.386702210916575, 5.370807726609491), 'optimal_rotation_angle': 3.2224726220246245}
>>>
