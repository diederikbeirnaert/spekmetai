# 🍳 SpekmetAI

Een quizapp in de stijl van Kahoot, in het thema van spek met ei. Er hoort ook een weekendbrief bij.
Het is gewone HTML, CSS en JavaScript: er is geen build-stap en geen framework. Het draait gratis op **GitHub Pages** en **Firebase** (Spark-plan).

| Pagina | Wat |
|---|---|
| `index.html` | Home: je vult er een quizcode in en ziet de laatste weekendbrief |
| `play.html` | Spelers: code, naam en avatar invullen en dan antwoorden op de gsm |
| `host.html` | Groot scherm (beamer of tv): code, QR-code, vragen, media, tussenstand en podium |
| `admin.html` | Login voor de admin: quizzen maken, weekendbrieven schrijven, back-up |
| `brief.html` | Weekendbrieven lezen |
| `login.html` / `account.html` | Eén login voor iedereen (gebruikersnaam of e-mail), account en wachtwoord wijzigen |
| `jury.html` | Jury-gsm voor de Twister-quiz |
| `raadkaart.html` | Raad de locatie van het weekend (weekendgangers) |
| `portaal.html` | Weekendgangers: flip het ei in de pan en onthul je geheime opdracht 🤫 |

---

## 1. Firebase instellen (eenmalig, ongeveer 10 minuten)

1. Ga naar <https://console.firebase.google.com> → **Add project**. Kies een naam, bijvoorbeeld `spekmetai`. Google Analytics mag uit.
2. **Build → Realtime Database → Create database**. Kies de locatie **Belgium (europe-west1)** en start in **locked mode**.
3. Open het tabblad **Rules**. Plak de volledige inhoud van [`database.rules.json`](database.rules.json) en klik op **Publish**.
4. **Build → Authentication → Get started**. Zet onder *Sign-in method* deze twee aan:
   - **Email/Password**
   - **Anonymous** (dat is voor de spelers)
5. Klik in Authentication op **Users → Add user**. Vul je e-mailadres in, met als wachtwoord `spekmetei`.
6. Ga naar ⚙️ **Project settings → Your apps → Web (`</>`)** en registreer een app (Hosting hoeft niet). Kopieer de `firebaseConfig`-waarden naar [`js/firebase-config.js`](js/firebase-config.js).
   Kijk goed na dat `databaseURL` erbij staat. Die vind je ook bovenaan de Realtime Database-pagina.
7. Start de site (zie hieronder) en log in via `admin.html`. Je ziet dan je **UID**. Voeg in **Realtime Database → Data** het volgende toe:
   `admins` → `<jouw UID>` : `true`
   Herlaad de pagina: je bent nu admin. 🎉
8. Klik op **Voorbeeldquiz laden** en probeer het uit.

> De waarden in `firebase-config.js` zijn niet geheim. De echte beveiliging zit in de database-regels:
> - alleen de admin kan quizzen lezen en schrijven, dus spelers zien de antwoorden niet;
> - spelers kunnen alleen zichzelf toevoegen en één keer per vraag antwoorden, terwijl de vraag open staat.

## 2. Lokaal testen

```bash
node server.js
```

- Surf naar <http://localhost:8080>.
- Wil je meerdere spelers testen? Open `play.html` in meerdere **tabbladen**. Elk tabblad is een aparte speler.
- Wil je met je gsm testen? De server toont een netwerkadres, bijvoorbeeld `http://192.168.1.20:8080`. Open op je computer dan ook de **host** via dat adres, zodat de QR-code naar het juiste adres wijst.
  Werkt inloggen op dat adres niet? Voeg het IP-adres toe onder *Authentication → Settings → Authorized domains*.

Heb je geen Node? Dan werkt `python3 -m http.server 8080` ook.

## 3. Online zetten op GitHub Pages

```bash
git add . && git commit -m "SpekmetAI 🍳"
git remote add origin https://github.com/<gebruiker>/<repo>.git
git push -u origin main
```

Ga daarna op GitHub naar **Settings → Pages → Source: Deploy from a branch → `main` / root**.
Na ongeveer 1 minuut staat alles op `https://<gebruiker>.github.io/<repo>/`.

Voeg `<gebruiker>.github.io` toe aan *Firebase → Authentication → Settings → Authorized domains*.

## Zo werkt een quiz

1. Ga naar **Admin**, maak een quiz en klik op **▶ Host**. Het grote scherm toont een code en een QR-code.
2. Spelers surfen naar de site, of scannen de QR-code, en vullen de code en hun naam in.
3. Klik op **Start** (of druk op de spatiebalk). Het verloop per vraag is:
   intro → antwoorden → onthulling → tussenstand → … → podium 🏆
4. Punten: tot 1000 per vraag (of 2000 bij dubbele punten). Hoe sneller je antwoordt, hoe meer punten. Een reeks juiste antwoorden geeft een bonus.

**Vraagtypes**

| Type | Uitleg |
|---|---|
| Meerkeuze | 2 tot 4 antwoorden, één of meer kunnen juist zijn |
| Waar / niet waar | |
| Open antwoord | Hoofdletters en accenten tellen niet mee |
| Infoslide | Tekst of video zonder vraag |

**Media** (alleen te zien op het grote scherm)

- **Afbeelding**: een URL, of een upload. Uploads worden automatisch verkleind en opgeslagen in Firebase.
- **YouTube**: plak de link. `?t=43` werkt ook om op een bepaald moment te starten.
- **Google Drive**: plak de deellink en zet delen op "Iedereen met de link".

Bij een vraag met een video start de timer pas als je op **Antwoorden openen** klikt.

## Geheime opdrachten voor het weekend

1. Ga naar **Admin → 🤫 Weekendgangers** en voeg iedereen toe. De gebruikersnaam en het wachtwoord worden automatisch ingevuld, maar je mag ze aanpassen.
2. Typ per persoon de geheime opdracht en klik op **Opslaan**.
3. Klik op **📋 Login kopiëren** en stuur het bericht door via WhatsApp of een ander kanaal.
4. De weekendganger logt in, tikt op het ei in de pan en ziet de opdracht verschijnen. In de admin zie je wie zijn ei al geflipt heeft.

Wijzig je een opdracht? Dan moet die persoon het ei opnieuw flippen.

**Avatars:** kies bij elke weekendganger een getekende avatar uit het rijtje; die staan als SVG in [`avatars/`](avatars/). Je kan ook op de cirkel klikken en een eigen PNG zonder achtergrond kiezen. Met de bolletjes ernaast kies je de achtergrond: eigeel, spekreepjes, pan, toast, ontbijtbord, AI-circuit, avocado of bosbes. Een ingelogde weekendganger die meedoet aan een quiz, vult alleen de code in. Naam en avatar worden dan automatisch gebruikt.

## 🌀 Twister-quiz (met echte mat)

Zet in de quiz-editor **🌀 Twister-quiz** aan. Kies daarna het aantal plekken op de mat (standaard 4), en of je **📸 SpekVAR** wil gebruiken.

**Kleuren = antwoorden:** A = rood, B = blauw, C = geel en D = groen. Bij waar/niet waar is rood waar en blauw niet waar.

**Per vraag:**
1. De spinner draait en kiest een ledemaat. Je kan per vraag ook zelf een vast ledemaat instellen.
2. De vraag en de antwoorden verschijnen op het scherm, met 6 seconden leestijd.
3. **Matspelers** zetten hun ledemaat op de kleur van hun antwoord. De andere spelers antwoorden op hun gsm en kunnen gokken **wie er aanbrandt** (+300).
4. De jury tikt per matspeler de kleur aan, **in de volgorde waarin ze neerzetten**. Die volgorde bepaalt de snelheidspunten. 🔥 staat voor aangebrand.
5. Na de tijd volgt **FREEZE! 🥶** met een fluitsignaal, en SpekVAR maakt een foto van de mat.
6. De onthulling toont de punten en wie er van en op de mat gaat.

**Punten op de mat:**

| Situatie | Punten |
|---|---|
| Juist | Tot 1000 punten (volgens de volgorde) |
| Blijven staan | +150 |
| Fout | 0 punten, en je blijft staan |
| Aangebrand | −500 |

**Rotatie:**
- Wie aanbrandt, gaat sowieso van de mat.
- Is niemand aangebrand, dan gaat de traagste met een fout antwoord eraf, maar alleen als er iemand kan invallen.
- Vrije plekken gaan naar de beste gsm-speler van die vraag: wie juist antwoordde, het snelst.

**Jury:** jij kunt dat als host op het grote scherm doen. Iemand anders kan ook jureren met een gsm via `jury.html`, met de code en de pin die in de lobby staan. Beide jury's synchroniseren live met elkaar.

**SpekVAR:** kies in de lobby je (externe) webcam. De foto's blijven lokaal en verschijnen op het einde als bloopers. Zonder webcam zet je SpekVAR uit in de quiz-instellingen.

## 🛡️ Admin light

In **Admin → 🤫 Weekendgangers** geef je een weekendganger met een vinkje **admin light**. Die ziet dan via zijn account een knop **"Naar de keuken"**.

Admin light mag:
- quizzen maken en aanpassen (niet verwijderen);
- quizzen hosten en jureren;
- geheime opdrachten geven;
- op de raadkaart ieders gokken bekijken (niet de geheime locatie of de afstanden) en zelf gewoon meeraden.

Accounts, wachtwoorden, avatars, de weekendbrief, de instellingen en het beheer van de raadkaart blijven alleen voor de admin.

## 🗺️ Raadkaart: "Waar bakken we?"

Weekendgangers raden waar het weekend doorgaat.

**Zo werkt het:**
- Je moet ingelogd zijn en mag **1× per dag** een speldje op de kaart prikken.
- Het **temperatuur-ei** toont hoe dicht je zit. Er zijn 40 stappen over 300 km: binnen 70 km is het ei al lauw, en hoe dichterbij, hoe fijner de stappen (tot < 50 m). Het ei gaat van een bevroren ei in een ijsblok tot een gloeiend ei met vlammen en een gouden kroontje.
- De echte locatie is niet uit de website te lezen. De database controleert zelf welke temperatuur klopt.

**Admin → 🗺️ Raadkaart:**
- Prik de geheime locatie, geef ze een naam en zet de kaart open. Klik altijd op **Opslaan**: dat stuurt ook de tabel met de 40 temperatuurgrenzen mee.
- Met **🧪 Testmodus** mag je onbeperkt raden, ook als admin. Achteraf wis je de testgokken met één knop.
- **🥚 Onthul** toont de locatie aan iedereen. Alle avatars verschijnen op hun beste gok, met de afstand erbij. Wie het dichtst zat, wint.

**Quizbonus:** zet in een quiz **🗺️ Raadkaart-bonus** aan. Dan krijgt de winnaar ×1,2 op al haar punten in die quiz.

## Twister 🌀

In **Admin → 🌀 Twister** vind je een draaischijf in spiegelei-stijl. Klik op het ei of op **Draai!**.

## Data en back-up

Alles staat in de Firebase Realtime Database. Die is zelf één grote JSON-boom:

```
quizzes/   quizzen (alleen de admin kan ze lezen)
media/     geüploade afbeeldingen
letters/   weekendbrieven (publiek)
games/     lopende spellen (worden na 24 uur opgeruimd)
members/   weekendgangers (alleen de admin en de persoon zelf)
missions/  geheime opdrachten (alleen de admin en de persoon zelf)
avatars/   avatar + achtergrond van weekendgangers
admins/    wie admin is
```

De getekende avatars pas je aan in [`avatars/generate.mjs`](avatars/generate.mjs) (kapsel, kleuren, bril…) en maak je opnieuw met `node avatars/generate.mjs`.

In **Admin → Instellingen** kun je alles exporteren naar één `db.json` en weer importeren.
[`data/db.json`](data/db.json) bevat de voorbeeldquiz in hetzelfde formaat.
