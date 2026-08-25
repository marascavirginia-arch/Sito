# Scadenzario — gestione scadenze pratiche

Strumento interno (non collegato al sito pubblico dello studio) per
tenere sotto controllo le scadenze processuali delle pratiche.

Apri `scadenzario/index.html` (con un server statico, vedi il README
principale, oppure direttamente tramite l'URL pubblicato con GitHub Pages,
es. `https://.../Sito/scadenzario/`).

## Installarla come app (icona su telefono/PC)

Lo Scadenzario è una PWA (Progressive Web App): una volta pubblicato online,
si può "installare" senza App Store, ottenendo un'icona che apre l'app a
schermo intero come un'app vera. I dati restano comunque salvati solo in
locale (localStorage), nulla viene inviato a un server.

- **iPhone/iPad (Safari)**: apri il link → icona di condivisione (il
  quadrato con la freccia) → **"Aggiungi alla schermata Home"**.
- **Android (Chrome)**: apri il link → menu ⋮ → **"Aggiungi a schermata
  Home"** (o compare un banner automatico "Installa app").
- **Mac/Windows (Chrome o Edge)**: apri il link → icona di installazione
  nella barra degli indirizzi (o menu ⋮ → **"Installa Scadenzario"**).

Da quel momento l'app funziona anche offline (i file dell'app sono in
cache tramite `sw.js`); i dati delle pratiche restano quelli di quel
browser/dispositivo — usa "Backup (.json)" per portarli su un altro.

## Cosa fa

1. Per ogni pratica si inserisce il **cliente**, il **rito** (Civile,
   Amministrativo, Tributario) e il tipo di procedimento specifico
   (es. rito ordinario a citazione, rito semplificato, TAR ordinario,
   TAR abbreviato/appalti, rito camerale accesso/silenzio, primo grado
   tributario, impugnazioni...).
2. In base alle date note (notifica, udienza, pubblicazione sentenza...)
   l'app calcola automaticamente le scadenze rilevanti (costituzione,
   memorie, repliche, fase cautelare, impugnazioni), applicando le
   regole di:
   - **giorni liberi** (dies a quo e dies ad quem esclusi);
   - **sospensione feriale** (1-31 agosto);
   - **proroga/anticipo per giorno festivo** (i termini che decorrono
     "in avanti" si prorogano al primo giorno feriale successivo; i
     termini "a ritroso" da un'udienza si anticipano al giorno feriale
     precedente).
3. Le scadenze si vedono in un elenco per pratica, con evidenza delle
   scadenze **scadute** (rosso) e **imminenti entro 7 giorni** (ambra), e
   si possono spuntare come completate.
4. I dati (clienti, pratiche, scadenze) restano **salvati solo nel
   browser** (localStorage) di chi usa l'app — non c'è un server
   obbligatorio. Usa il pulsante **"Backup (.json)"** per esportare/
   importare i dati manualmente tra un dispositivo e l'altro, oppure
   attiva la **sincronizzazione automatica su Google Drive** (vedi sotto)
   per vederli aggiornati da soli su telefono e computer.

> **Importante**: le date calcolate sono un supporto, non un parere
> legale. Vanno sempre verificate con il fascicolo e la prassi del
> foro/ufficio competente (specie per rinvii d'udienza, notifiche a più
> destinatari, festività locali).

## Collegare Google Calendar

Ci sono due modalità, indipendenti tra loro.

### 1. Esportazione `.ics` (funziona subito, nessuna configurazione)

Il pulsante **"Esporta .ics"** (per singola pratica) o **"Esporta tutte
le scadenze (.ics)"** scarica un file che può essere importato in blocco
in Google Calendar:

1. Vai su [calendar.google.com](https://calendar.google.com) → icona
   ingranaggio → **Impostazioni** → **Importa e esporta** → **Importa**.
2. Seleziona il file `.ics` scaricato e il calendario di destinazione.
3. Tutte le scadenze vengono create in un solo passaggio, con
   promemoria pop-up automatici a **20, 10 e 5 giorni prima**.

### 2. Sincronizzazione diretta con un click (opzionale)

Con questa modalità il pulsante **"Sincronizza con Google Calendar"**
crea gli eventi direttamente nel calendario Google, senza scaricare né
importare nulla. Richiede di creare, una tantum, un **OAuth Client ID**
gratuito su Google Cloud — **lo stesso Client ID serve anche per la
sincronizzazione delle pratiche tra dispositivi** (vedi sezione
successiva): un'unica configurazione abilita entrambe le funzioni.

1. Vai su [console.cloud.google.com](https://console.cloud.google.com/)
   e crea un nuovo progetto (o usane uno esistente).
2. **API e servizi → Libreria**: cerca **"Google Calendar API"**,
   attivala; ripeti la ricerca per **"Google Drive API"** e attiva anche
   quella (serve per la sincronizzazione delle pratiche).
3. **API e servizi → Schermata di consenso OAuth**: tipo *Esterno*,
   compila i campi obbligatori (nome app, email); non serve la verifica
   di Google per un uso interno con pochi utenti — aggiungi la tua email
   (e quella di chiunque altro userà l'app) come "utente di test" se
   l'app resta in modalità test.
4. **API e servizi → Credenziali → Crea credenziali → ID client OAuth**:
   - Tipo applicazione: **Applicazione web**.
   - **Origini JavaScript autorizzate**: l'indirizzo da cui apri l'app,
     es. `https://marascavirginia-arch.github.io` (per GitHub Pages) e/o
     `http://localhost:8000` per i test in locale.
   - Salva e copia il **Client ID** generato (termina con
     `.apps.googleusercontent.com`).
5. Incolla il Client ID in `scadenzario/js/calendar-config.js`:

   ```js
   window.CALENDAR_CONFIG = {
     googleClientId: "IL-TUO-CLIENT-ID.apps.googleusercontent.com",
     googleCalendarId: "primary",
   };
   ```

6. Ricarica la pagina: i pulsanti di sincronizzazione diventano attivi.
   Al primo utilizzo Google chiederà di accedere e autorizzare l'app;
   un'unica autorizzazione copre sia la creazione di eventi sul
   calendario sia la sincronizzazione delle pratiche su Drive (nessun
   altro dato dell'account viene letto).

Finché `googleClientId` resta vuoto, resta disponibile solo
l'esportazione `.ics`, che è sufficiente per un uso quotidiano senza
configurazioni aggiuntive.

## Sincronizzare le pratiche tra dispositivi (Google Drive)

Per vedere le stesse pratiche su telefono e computer senza esportare e
importare backup a mano, l'app può salvarle in un file nascosto nel
Google Drive dell'utente (`pratiche.json`, in una cartella dati-app
invisibile nel Drive normale — non l'intero Drive, solo quel file).

Richiede lo stesso Client ID OAuth descritto sopra (con anche la
**Google Drive API** attivata). Una volta configurato:

1. Apri l'app, pannello **"Sincronizzazione tra dispositivi"** → tocca
   **"Sincronizza pratiche con Google"**.
2. Accedi con l'account Google da usare per tutti i dispositivi.
3. Ripeti sullo stesso account su ogni altro dispositivo (telefono, PC):
   la prima sincronizzazione unisce le pratiche già presenti su
   ciascuno, poi restano aggiornate da sole a ogni modifica.

Dettagli pratici:

- Il pulsante diventa **"Sincronizza ora"** una volta connessi: usalo se
  vuoi forzare un aggiornamento immediato (in automatico, l'app prova
  comunque a sincronizzarsi da sola all'apertura e dopo ogni modifica).
- Se la stessa pratica viene modificata su due dispositivi prima che si
  sincronizzino, vince la modifica più recente (non un'unione dei
  singoli campi).
- Le **cancellazioni** di pratiche non sono garantite propagarsi a un
  dispositivo che, al momento della cancellazione, non era ancora stato
  sincronizzato: limite noto di questa prima versione.
- **"Disconnetti questo dispositivo"** ferma la sincronizzazione solo
  localmente: le pratiche già scaricate restano su quel dispositivo, ma
  smettono di aggiornarsi.

## Struttura dei file

```
scadenzario/
  index.html            Pagina dell'app
  manifest.webmanifest  Manifest PWA (icona/installazione)
  sw.js                 Service worker (cache offline dell'app)
  css/app.css            Stili (riusa la palette del sito principale)
  js/auth-config.js      Hash della password di accesso all'app
  js/auth.js             Overlay "Accesso riservato"
  js/date-utils.js       Calcolo date: giorni liberi, festivi, sospensione feriale
  js/riti.js             Regole dei riti civile/amministrativo/tributario
  js/store.js            Salvataggio pratiche in localStorage + merge per la sincronizzazione
  js/google-auth.js      Login Google condiviso (Calendar + Drive)
  js/calendar.js          Esportazione .ics + sincronizzazione Google Calendar
  js/calendar-config.js   Client ID Google (da configurare, vedi sopra)
  js/drive-sync.js        Sincronizzazione pratiche su Google Drive tra dispositivi
  js/app.js               Interfaccia: form, elenco pratiche, azioni
```

## Estendere le regole dei riti

Le regole di calcolo sono tutte in `js/riti.js`, in forma dichiarativa
(un oggetto per ogni rito/sottotipo con i campi da chiedere e la
funzione che calcola le scadenze). Per aggiungere un nuovo tipo di
procedimento o correggere un termine, si modifica solo quel file: la UI
e il resto dell'app si adattano automaticamente ai campi dichiarati.
