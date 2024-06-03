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

Likningssystem jeg må løse:

* lng_nw, lat_nw = ?, ?
* lng_se, lat_se = ?, ?


Kjente verdier med eksempler:

* lng_1_map, lat_1_map : (5.3, 60.4)
* lng_2_map, lat_2_map : (5.4, 60.3)


* x_1, y_1 : 0.2, 0.2
* x_2, y_2: 0.8, 0.8

* x_nw, y_nw: 0, 0
* x_se, y_se: 1, 1


Forutsetning er øst for Greenwitch og nord for ekvator.
