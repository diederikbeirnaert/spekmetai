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

## Twister 🌀

In **Admin → 🌀 Twister** vind je een draaischijf in spiegelei-stijl. Klik op het ei of op **Draai!**. Het resultaat wordt ook voorgelezen, dat kun je uitzetten.

## Data en back-up

Alles staat in de Firebase Realtime Database. Die is zelf één grote JSON-boom:

```
quizzes/   quizzen (alleen de admin kan ze lezen)
media/     geüploade afbeeldingen
letters/   weekendbrieven (publiek)
games/     lopende spellen (worden na 24 uur opgeruimd)
members/   weekendgangers (alleen de admin en de persoon zelf)
missions/  geheime opdrachten (alleen de admin en de persoon zelf)
admins/    wie admin is
```

In **Admin → Instellingen** kun je alles exporteren naar één `db.json` en weer importeren.
[`data/db.json`](data/db.json) bevat de voorbeeldquiz in hetzelfde formaat.
