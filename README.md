# BergenOmap

Orienteringskart for Bergen, med GPS-støtte for oppdagelsesferd i fremmed skog.


# Utviklingsmiljø

For å kjøre servere for utvikling:

cd C:\Source\BergenOmap\backend; python .\Backend.py
cd C:\Source\BergenOmap; python -m http.server 8000

cd /Users/Geir/Source/BergenOmap/backend; python3 Backend.py
cd /Users/Geir/Source/BergenOmap; python3 -m http.server 8000

Serves fra fx. http://127.0.0.1:8000/map.html

# TODO

Shortlist: Auth (trengs db-endringer), legge inn flere kart

## Registrering av kart

- [ ] Legg inn duplikat av status-bar på Data-tabben
- [ ] Få inn fil-lasting i status-bar, juster første melding for å forklare flyten
- [ ] "Start"-siden sine elementer kommer side-by-side på iPhone 15 Pro
- [ ] Teste mer i Safari, kanskje på Mac for bedre debugging. Markør-grab og dobbelt-trykk er fortsatt dårlig på mobil

- [ ] Endre auto-zoom ved valg av registrert map til en mer fornuftig verdi

- [x] Filter i "or you can select an existing map" - velger, som filtrer på streng-navn
- [x] Ideelt sett burde klikk/press på overlay-markører gripe dem i "håndtaket", ikke mål-pikselen (vrient å treffe på mobil)
- [x] På safari/ios fører gestures til at bildet blir "valgt"; frys muligheten for seleksjon i JS
- [x] Markør-ikonene i overlay krymper ikke når man zoomer; tror det også forårsaker at pinch-zoom feiler.
- [x] Det dukket opp en bug i OverlayView; markør kommer ikke der muspekeren er. Men bare i mobil-bredde.
- [x] Markørene bør også være sticky; ser dem ikke når vi scroller ned på desktop
- [x] Frys mulighet til å zoome på selve siden på mobil? Det er mulig på iPhone
- [x] Test mobilvennlig registrering på fysisk mobil
- [x] Zoom-mulighet i bildevisning (kun på mobil)
- [x] Metadata-visning på mobil havner under knappene øverst; fiks det
- [x] Mobilvisning: Få chatbotten til å gå gjennom CSS & JS og se om det er noe som kan forenkles eller gjøres tydeligere
- [x] Mobilvennlig layout og funksjonalitet for kart-registrering; mobilvennlig layout & navigasjon
- [x] Endre koordinat-visning sånn at den kun viser de tilgjengelige markørene, ikke koordinatene (highlight neste ledige markør)
- [x] Fjerne kode som etter endringen i koordinat-visning vil være ubrukt
- [x] Verktøy som lar deg gjennomgå en eksisterende registrering, og viser med markørene hvor kontrollpunktene er satt
- [x] Grensesnitt for å redigere metadata i databasen uten å røre kart-registreringen. Løser også forrige, hvis du kan velge kart
- [x] For registrering i bedriftscuppen, bør jeg ha et verktøy som raskt lar meg sette samme registrering på identiske kart (egen side?)
- [x] (0) + lagre metadata fra mappestruktur. Trenger bare å få det ustrukturert inn i databasen; kan ta detaljene med AI-modell senere.
- [x] Endre brukerflyt: én knapp for å finne plassering og forhåndsvise (eller "prøve på nytt"), og én for å lagre kartet i DB
- [x] Fjern knapp og kode for registrering av kart fra JSON, trenger det ikke lenger (databasen er pålitelig nå)
- [x] Skjule koordinat-visningen i kartregistrerings-grensesnittet
- [x] Refaktorering av nytt markør-grensesnitt for bedre lesbarhet
- [x] Forbedre markør-visningen så den viser klikk-koordinatet mer presist
- [x] Få inn merker i tre farger for hvor man har klikket på kart og overlay ved registrering, la brukeren dra dem rundt
- [x] Mistenker at det er lurt å refaktorere kode til moduler først, for etter dette vil JS-filen ha veldig mye state-håndtering
- [x] Legge inn ny constraint i beregningen av kart-hjørnenes koordinater: At aspect-ratio til kart-rektangelet ikke skal endre seg
- [x] Støtt transformering av PDF til PNG når du drag-and-dropper en PDF i registreringsvinduet
- [x] Legg inn knapp for å bytte mellom satellittfoto og Norgeskart i Leaflet
- [x] Ser ikke ut som metadata-egenskapene flyttes inn i databasen fra registrerings-browser; fiks det.
- [x] Bytte mellom flyfoto og raster-kart under registrering
- [x] Milepæl, registrering av kart er nå ganske enkelt! Kommet langt siden jeg måtte sjonglere filer og JS-definisjoner :)
- [x] Bedre ergonomi ved velging av 3+3 punkter, helst ved å både kunne se orienteringskart og Leaflet ved siden av hverandre
- [x] Koble den nye algoritmen opp til knappen som registrerer alt i databasen; her er det en bug
- [x] Mer pålitelig algoritme for å registrere kart, må også ta høyde for "forstørr-og-roter"-behovet som kommer fra Leaflet
- [x] Output hvilken feil algoritmen regnet ved registrering
- [x] (0) Du kan gjerne putte denne i databasen ved registrering
- [x] Mer presis muspeker i Leaflet-kart, for presis registrering
- [x] Preload Map name og Filename i registrerings-vindu når du drag & dropper en kartfil
- [x] Må få inn JSON med metadata for kart: Dato, område, event, løype, kart-tegner, kart-klubb, løypelegger
- [x] Knapp for å dumpe kartfiler og kart-definisjoner i javascript fra DB til disk
- [x] Knapp for å skru av og på forhåndsvisning registrert kart i registrerings-app
- [x] (0) Lag programvare for å slå disse kartene sammen til (post-frie) kart man kan bruke i terrenget
- [x] Helhetlig integrert grensesnitt for behandling av bildefil og registrering av kart
- [x] Ideelt sett mulighet for å lagre info om registrering til database, så registrering av nye kart går fortere
- [x] Lag scraper for å hente og sortere alle kartene fra o-bergen
- [x] Lag grensesnitt for å plassere kartet riktig, basert på algoritme
- [x] Standardiser marger på overlay som en prosent av lengste dimensjon (13% per side er rimelig)
- [x] Lag enkel software for å konvertere PDFer og fjerne magenta-linjer
- [x] (0) Estimer kart-dimensjoner med høyde for mine selvpåførte marger
- [x] Legg inn nytt og mer detaljert kart
- [x] (0) Lag justerbar gjennomsiktighet for overlay
- [x] (0) Preload +/- 5 grader rotasjon fra back-end
- [x] Lag algoritme for rotasjon og plassering av overlay
- [x] Beregn matematikken for å klikke på bilde og kart for å regne ut riktige koordinater
- [x] (0) Fiks system for å dra et punkt på O-kartet til å matche ekte-kartet
- [x] Fiks system for å rotere kart
- [x] Regn ut koordinater for kart basert på dimensjon og målestokk for A4-kart
- [x] Bytt checkboks til å resize kart og beholde forhold mellom X- og Y-dimensjon
- [x] Motta bildefil til server med drag'n'drop
- [x] Transformer bildefil på server til kart med gjennomsiktige marginer og null rotasjon
- [x] Send respons tilbake til server
- [x] Sett dimensjons-velgeren til bildet du har sendt
- [x] (la brukeren gjøre registreringsprosessen)
- [x] Få opprinnelig bildefil tilbake til server (sånn at den kan roteres til rett vinkel)
- [x] Roter opprinnelig bilde til vinkel spesifisert av registreringsprosess
- [x] Sett inn bilde-filnavn og andre innhentede data i JSON-datastruktur
- [x] Send JSON-datastruktur til server 
- [x] Lagre rotert bilde på server
- [x] Eventuelt med kartnavn og annen metadata spesifisert i registrerings-vinduet
- [x] Sørg for at filer/filnavn og JSON-data kan hentes inn i mapBrowser.js


## Navigasjons-app


- [ ] Løp et treningsløp i skogen med appen som guide

- [x] Zoom-innstilling som finner mobil-dimensjoner og setter zoom til å tilsvare kartets målestokk (1:7500 inntil videre)
- [x] (0) Kartet orienteres etter retningen man holder mobilen (toggle av/på) (støttes ikke av JS-API)
- [x] Refaktorere JS til moduler, og gi Cursor konteksten av hva vi skal gjøre med GPX og trenings-feature senere.
- [x] (0) Vise en slags highlight i det brukeren har valgt å laste et kart, sånn at de forstår at det skjer noe i bakgrunnen
- [x] (0) Skru av live oppdatering av posisjons-visning når du simulerer posisjon, ellers spretter den tilbake
- [x] (0) Kanskje en debug-mode som gjør det lettere å velge simulert posisjon på kartet? [trenger det ikke]
- [x] Visuelt fine segmented controls for å velge modus på kart-velgeren (nær meg eller nær kart-sentrum)
- [x] Sentrer kartet på brukerens posisjon (knapp)
- [x] Kartet følger brukerens posisjon (toggle av/på)
- [x] Kanskje med en toggle-knapp øverst for å følge posisjonen til brukeren?
- [x] Kanskje prøve ut om det finnes en måte å vise på oversiktskartet hvilke kart som er tilgjengelige.
- [x] Vise en liste over alle kart som er tilgjengelige på posisjonen kartet er satt
- [x] Prøv med sentrering på nåværende posisjon første gang du laster siden.
- [x] Bedre grensesnitt for valg av kart. Full liste, sorter på avstand, vis kartene for nåværende posisjon, rask toggle mellom dem.
- [x] Hosting, som eksponerer appen på internett
- [x] Flere kart på en gang (generalisert, basert på en liste som kommer som parameter)
- [x] Velge hvilke(t) kart man vil se, når det er flere å velge mellom (fx. ikke laste før du klikker på kart-området)  
- [x] GPS-posisjon vises på kartet
- [x] Visning hvor kart er satt til korrekt posisjon med 0% opacity

## GPX-viewer

Løse ideer: Spline-basert justering av track? 

- [ ] Bytt farge på track til rosa + halvgjennomsiktig0
- [ ] Beregning av lat/lon "bounding box" for et GPX-track; trengs for enkelte features. Database, ved innsetting?
- [ ] Filtrering av kart- og track-valg basert på hva som overlapper det som er valgt i den andre listen
- [ ] Knapp for å velge flyfoto
- [ ] Penere styling av GPX-opplastingsdialogboks
- [ ] Gjøre listene for å velge track og kart litt penere i stylingen
- [ ] Ved mouseover for å se tid: Framhev punktet på tracket brukeren studerer akkurat nå
- [ ] Mulighet for å "spille av" løpet, og bla fram og tilbake i løpets framdrift
- [ ] Mulighet for å visualisere hastighet med farger
- [x] Mer granulær zoom, for å gjøre det enklere med screenshots til Strava
- [x] Mouse-over på GPS-track for å se tid
- [x] (0) Flytt kartvisning til sentrum av kart du velger et nytt kart (UX funker ikke pga. omstokking av kart-liste)
- [x] (0) Flytt kartvisning til sentrum av track når du velger et nytt track
- [x] Undersøk om det er mulig å få "border" på polylinen, for å lettere skille krysninger av eget spor
- [x] Mulighet for å laste opp GPX-filer og lagre dem i database (inkludert enkel metadata, fx. et navn)
- [x] Mulighet for å vise Strava-track fra tidligere løp på et orienteringskart (kanskje i helt separat view)
- [x] Database-støtte for å samle en brukers informasjon (fx. GPX-filer fra Strava)
- [x] Mulighet for å velge kart, trolig samme liste som før men kun med "nær kartvindu"
- [x] Mulighet for å velge hvilken GPX-fil man skal vise

## Trenings-app

- [ ] Mulighet for å velge kart, trolig samme liste som jeg allerede har
- [ ] Database-støtte for å lagre hvor på kartet hver av postene befinner seg
- [ ] Støtte i registrerings-grensesnitt for å markere hvor på kartet hver post er (ny side, tror jeg)
- [ ] Visning av hvilke poster man har vært innom
- [ ] Automatisk stempling (med minste avstand til post, og GPS-presisjon)
- [ ] Mauell stempling (registrer avstand og presisjon fra GPS)

## Infrastruktur


- [ ] Database-nøkkel som gir versjonen av et bestemt kart, slik at jeg kan cache i nettleseren til brukeren

- [x] Slå sammen igjen databaser fra disk, hvor du slettet originalkartene i den ene
- [x] Make eller tilsvarende system, som gjør deploy-prosessene mine og virker på både Windows og OS X
- [x] På et tidspunkt vil jeg kanskje ha en indeks-primærnøkkel heller enn å bruke kartnavnet, pga. mange kart i samme område
- [x] Deployment på EC2/Lightsail
- [x] Scanne alle O-kartene mine som ikke er fra bedriftscup
- [x] Laste ned 2025-kartene fra bedriftscup (bruk script)
- [x] (0) Deploy-skript som genererer kart og kopierer filer til S3. Alternativ for å overskrive eksisterende kart.
- [x] Serving av kart via DB-grensesnitt, så man slipper å tenke på filsystem
- [x] Koble på og justere "dump database-funksjon" så filene kommer inn i AWS-katalogen og brukes direkte av kart-appen
- [x] Bruke DB uten server: Kommando som dumper definisjoner og kartfiler fra DB -> disk, for rask kopiering til AWS (se under)
- [x] MapDefinitions.py -> Database (også med kart/bilder) -> kartfiler på disk + mapDefinitions.js som leses av mapBrowser.js
- [x] Må lagre detaljene om de 6 koordinatene i DB ved registrering, så jeg kan rekonstruere registreringen i ettertid
- [x] Legge til multiline-tekstfelt i database for credits for kart
- [x] Database-lagring av kartfiler
- [x] Nytt web-grensesnitt for å bla i databasen. Dette kan du sikkert få ut fra én ChatGPT-prompt.
- [x] Se om det er mulig å komprimere kart-filene [webp 70% gir 50% mindre fil med OK kvalitetstap. Bør helst gjøres via config.]
- [x] Database for kart-registreringer (sqlite)
- [x] Javascript for å be nettleseren ikke sette låse telefonen ved inaktivitet


## Scanning og registrering av spesifikke kart

Det blir lettere å registrere resten av kartene for løp jeg allerede har registrert, siden kontrollpunktene i
GPS-kartet allerede er på plass. Så hvis jeg har lagt inn en god registrering for B, blir det veldig raskt
å også få inn A.

- [x] Registrere alle bedriftscup-kart fra løyper jeg har deltatt i: 2025 (A)
- [x] Registrere alle bedriftscup-kart fra løyper jeg har deltatt i: 2024 (B)
- [x] Registrere alle bedriftscup-kart fra løyper jeg har deltatt i: 2023 (B)
- [ ] Registrere alle bedriftscup-kart fra løyper jeg har deltatt i: 2022 (B)
- [x] Registrere alle bedriftscup-kart fra løyper jeg har deltatt i: 2021 (kun Stendskogen, N og A)

- [ ] Bedriftscup 2021 (B)
- [ ] Fra 2019-2012 er det færre A- og B-kart. Fokuser på disse når du kommer dit, unntatt på nye steder.

- [ ] Legge inn både A og B fra løp hvor jeg har registrert en løype allerede (gjenbruk registrering fra eksisterende løype)

- [ ] Legg inn GPX-spor fra alle de løpene mine fra Strava

- [x] Registrere alle tur-orienteringskartene
- [x] Registrere alle kartene som ikke er fra bedriftscuppen (mappe O-kart under Scans)
- [x] Jeg mangler løpene fra Dyreparken i 2024, vet ikke hvor de kartene har blitt av.
- [x] Spor opp alle de gamle turorienterings-kartene dine, og få dem på listen over kart å registrere. Se på Gmail & Downloads
- [x] Legge inn "månedens kart november" på Skage, hvor jeg og C gikk lørdagstur
- [x] Scanne alle kart fra løp som ikke er bedriftscuppen, så jeg kan legge dem inn
- [x] Gamle turorienteringskart som kan lastes ned fra turorientering.no
- [x] Legge inn mine kart fra løp som mangler fra bedriftscuppens nettside i perioden jeg har løpt


## Generelle forbedringer

- [ ] Autentisering, for å gjøre appen mindre tilgjengelig for Gud og hvermann. Auth med navn?
- [ ] Landingsside for auth

- [ ] Jeg har noen renamings-TODOer i koden; gjennomfør disse. Cursor tar dem sikkert one-shot, bare oppgi presise navn på rename.
- [ ] Kjøre gjennom database og re-generer roterte bilder med gjennomsiktige områder på alle steder som er utenfor selve kartet
- [ ] Cache Leaflet-filer, orienteringskart, og kart-definisjoner lokalt i appen i tilfelle brudd i nettverk (Cache Storage API?)
- [ ] Finjuster UI for kart-registrering på mobil mtp. marginer og andre detaljer; mye finpuss man kan gjøre

- [x] Renamet alle gamle bcup-registreringer i DB til navne-konvensjon med dato, område og løype
- [x] Menysystem for å bytte mellom de ulike modusene (spør chatbotten om paradigmer for å bytte mellom 3)
- [x] Lære meg utvikling fra Macbook
- [x] Kart-velger og GPX-velger må leve separat for hver side, ikke være delt mellom dem
- [x] Etter du har gjort saken over: Skru tilbake endringene som ble gjort for å gjøre kart-velger i map.html mer generisk
- [x] Beskjed i registrerings-grensesnitt om framdrift ved registrering ("Beregner registrering / overfører bilder / ferdig")
- [x] Mulighet for å lagre kart som webp. Når DB inneholder koordinater, original og live, kan du re-generere live on-demand som webp.
- [x] Funksjon for å re-generere final-bilder i database som webp og fjerne final-bilder for deploy
- [x] Fjern filnavnet fra viewDatabase-funksjonen; jeg trenger det ikke. Fjern også Attribution-feltet.
- [x] Det burde gå an å one-shotte en justering i registrerings-grensesnittet sånn at jeg lett kan putte inn de nye feltene jeg ønsker å lagre i databasen.
- [x] Lagre kun 6 desimaler i koordinater i DB ved registrering
- [x] Registrer kart på nytt, til database, som du nå kan arkivere en lang-levd kopi av
- [x] Slette filer som ikke er i bruk lenger, restrukturere appen så det relevante ligger i rot-katalogen
- [x] Refaktorere katalogene for database-eksport som lett-tilgjengelige konstanter øverst i Backend.py
- [x] Lagre pixel-koordinater fra registerImage.html til DB som int heller enn float; unødvendig å ta med desimalene.
- [x] Rename MapTransform.py til Backend.py; den inneholder nå en webserver som gjør mye forskjellig.
- [x] Rydd opp i database-innsetting i MapTransform-py, rename variabler til mer fornuftige navn++
- [x] Last ned alle de historiske kartene fra o-bergen
- [x] Python-script som laster ned alle kartene jeg er ute etter på en høflig måte
- [x] (0) Kart-dimensjoner i metadata for kartet, så jeg kan bruke de dataene i appen [nei, henter dette fra kartfilen]
- [x] Parameterisert input av hvilket kart man skal registrere i registerMap.html
- [x] Ikke bruke 'alert' ved feil i mottak av GPS-posisjon; det er veldig in-your-face
- [x] Lagt til kart over Munkebotn
- [x] Lagt til kart over Åstveitskogen
- [x] Lagt inn Storerinden -- litt usikker på registreringen
- [x] Lagt til sprintkart på Bønes
- [x] Lagt til gammelt kart (2005-ish?) fra Midtfjellet
- [x] Lagt til Blåmannen

## Bugs

- [x] Det er mulig å dobbelt-trykke på knappene i kartet for å mobil-zoome. Kanskje fjerne zoom på siden generelt.
- [x] Registrerings-verktøyet virker ikke på web (skyldtes krympet DB + max transfer size; fikset)
- [x] Serveren krasjer innimellom. ChatGPT har forslag til hva jeg kan sjekke etter reboot (OOM; tror det er fikset)
- [x] Hvis man trykker process registration flere ganger, får du nå duplikater i stedet for overskriving.
- [x] list_maps-spørringen tar 7 sekunder. Den må optimiseres, skal bare ta et øyeblikk.
- [x] Blåmannen-kartet "Blamannen-10k-rotates-weirdly.png" får rar rotasjon [løst med ny algoritme]
- [x] Fiks exceptions som skjer når du åpner database-visning
- [x] Backend sender nå felt-navnet "filename" i stedet for "map_filename" ved registrering (som gjør at map.html ikke finner den)

## Langsiktige ambisjoner

- [ ] Innsending av database-kart + kjente metadata til AI-modell for setting av metadata i database
- [ ] Ifm. henting av metadata fra kart: Ekstra DB-felt for kartets målestokk (og integrer det med auto-målestokk-knapp)
- [ ] Maskinlærings-system for å identifisere post-posisjoner på registrerte kart og regne disse om til ekte koordinater

- [ ] Strava-integrasjon med tillatelser, for å hente ut GPX-spor
- [ ] Logge track på turen du har gått så langt, med usikkerhet i GPS-mottak

- [ ] Kreditere kart-tegneren i grensesnittet, kanskje på placeholder-bildene før kartet lastes
- [ ] Når jeg får veldig mange kart, vil jeg kanskje ha et avansert filter for kart, som lar meg filtrere på metadata.
- [ ] Ta ned den gamle kart-appen, den nye appen er mye bedre

- [x] Kan velge å fjerne original-bildene fra prod-databasen for å spare båndbredde, de vil pr. nå aldri bli brukt der
- [x] Menysystem for å velge flere kart, hvis de overlapper i terrenget
- [x] Et mer ordentlig system for hosting og deploy, når det blir nødvendig
- [x] Deploy-script som setter opp all infrastuktur med én kommando [nært nok med bootstrap + scp]
- [x] (0) Automatisk identifikasjon av start/mål, poster, målestokk, postbeskrivelser, kart-areal via bildeanalyse med AWS, og utregning av GPS-koordinater for poster
- [x] (0) Kjør back-end i container som hostes på ECC og kobles mot S3 [dette skal jeg gjøre på en mer pragmatisk måte]
- [x] (0) Støtt direkte kobling mellom kartvisning og database i container [løst ved å la back-end serve kart rett fra DB]
- [x] (0) Kjøre selv-hostet instans av OpenStreetMap i container; la appen hente kart fra denne [løst med Kartverkets server]
- [x] Årstall for kart i JSON-format [dette går i attribution-feltet]

## Refaktorering

- [ ] Dobbeltsjekk om alle flex-reglene i 59f7c05 var nødvendige; tror mange kan fjernes

- [ ] Trekke felles kode ut i felles moduler? (Usikker på om jeg ønsker dette; greit vedlikeholdbart som det er)
- [ ] Felles environment-config på tvers av sider? (har nå dette for registerMap, men ikke kartvisningen)
- [ ] Refaktorere Python-kode i bedre modul-struktur

- [x] Kan hende jeg må refaktorere kart-visningen på et tidspunkt. Flere steg her.
- [x] Bruke ecmascript-moduler?
- [x] Refaktorere registerMap til EcmaScript-moduler
- [x] Refaktorere CSS til å bli separat mellom ulike sider
- [x] Rename CSS-fil for kartvisning slik at den matcher etter refaktoreringen


## Løse idéer som jeg er usikker på

- [ ] Verktøy for å finjustere registrering: rotasjon, størrelse, translasjon

- [ ] Animasjon med "flash" langs outline av kart før det lastes, for å gi brukeren en indikasjon på framdriften
- [ ] Gjøre det mulig å raskt fokusere på sentrum av valgt kart, hvis brukeren ønsker det (men vanskelig å få UXen bra)
- [ ] Går an å lagre en "løpende" komprimert utgave av kartet ved registrering (ekstra rad), for å slippe deploy-komprimering
- [ ] Registrere alle bedriftscup-kart som matcher registreringen fra allerede-registrerte løp, automatisk
- [ ] Registrere alle gjenstående bedriftscup-kart

- [x] (0) Legg til checkbox som lar deg registrere kartet til database hvis du leser inn registreringen fra JSON



## Deployment - hvordan kjøre deploy av appen


### Installere ny server fra bunnen av

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


### Deploy av endringer i app

Installer Just hvis du ikke har det:

winget install --id casey.Just (Windows)
brew install just (OS X)

For deploy, se Justfile for detaljer. 
Enkel deploy er fx. "just deploy-app"



## Kart-kilder -- flyfoto og topografiske kart

Den Kartverket-tjenesten jeg har benyttet meg av, støtter følgende kilder:

https://cache.kartverket.no/v1/wmts/1.0.0/europaForenklet/default/webmercator/{z}/{y}/{x}.png - grovt Europa-kart
https://cache.kartverket.no/v1/wmts/1.0.0/toporaster/default/webmercator/{z}/{y}/{x}.png - høy-kontrast raster
https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png - detaljert topografisk (min standard)
https://cache.kartverket.no/v1/wmts/1.0.0/sjokartraster/default/webmercator/{z}/{y}/{x}.png - sjøkart-raster
https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png - svart-hvitt topografisk


Kartverket / Norge i bilder tilbyr web service for flyfoto til ikke-kommersiell bruk. Se spesifikasjoner her:

https://kartkatalog.geonorge.no/metadata/norge-i-bilder-wmts-euref89-utm33/072662f8-41c9-4e9a-a55a-343dee0c3f84 - Euref89 UTM33 (Østlandet)
https://kartkatalog.geonorge.no/metadata/norge-i-bilder-wmts-euref89-utm32/2222a1d6-3225-43d7-806c-2c61a8328229 - Euref89 UTM32 (Vestlandet)
https://kartkatalog.geonorge.no/metadata/norge-i-bilder-wmts-mercator/d639038c-a75b-446a-ad0c-16301cabfd21 - Mercator

XML-spesifikasjoner er henholdsvis:

http://opencache.statkart.no/gatekeeper/gk/gk.open_nib_utm33_wmts_v2?SERVICE=WMTS&REQUEST=GetCapabilities
https://opencache.statkart.no/gatekeeper/gk/gk.open_nib_utm32_wmts_v2?SERVICE=WMTS&REQUEST=GetCapabilities
https://opencache.statkart.no/gatekeeper/gk/gk.open_nib_web_mercator_wmts_v2?SERVICE=WMTS&REQUEST=GetCapabilities

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




## Notater

Ser ut som at iPhone har mer presis GPS enn Garmin-klokker. Dette kan være relevant for løps-feature.

Jeg har custom-innstillinger for cache under Behaviors i CloudFront og Edit Metatada i S3. De er kortlevde.

For å be server liste første tidspunkt for alle unike IPer som har bedt om et kart:

zgrep -h "/api/dal/mapfile/final/" /var/log/nginx/access.log* \
  | awk '{ip=$1; ts=$4; gsub(/^\[/,"",ts); print ts, ip}' \
  | sort \
  | awk '{ts=$1; ip=$2; if(!(ip in first)){first[ip]=ts}} END{for(ip in first) print first[ip], ip}' \
  | sort