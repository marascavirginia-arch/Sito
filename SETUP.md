# Guida: mettere il sito davvero online

Quattro cose da fare, in questo ordine consigliato: **1) dominio e pubblicazione**,
**2) calendario**, **3) pagamenti**, **4) modulo per tema/documenti**.
Le prime tre passano tutte da **Microsoft Bookings**; l'ultima da un
**Google Form**, perché Bookings non supporta l'allegato di documenti.

---

## 1. Pubblicare il sito con un dominio tuo

### 1.1 Portare il sito sul branch principale
Il codice oggi vive sul branch `claude/install-ui-ux-pro-max-skill-rc3p25`.
Per pubblicarlo va prima unito a `main`:
1. Su GitHub, nel repo `marascavirginia-arch/Sito`, apri **Pull Request** →
   "New pull request" → base `main`, compare `claude/install-ui-ux-pro-max-skill-rc3p25`.
2. Crea e conferma il merge ("Merge pull request").

*(Se preferisci, dimmelo e la apro io direttamente.)*

### 1.2 Attivare GitHub Pages
1. Nel repo → **Settings** → **Pages**.
2. In "Source" scegli branch `main`, cartella `/ (root)`.
3. Salva. Dopo 1-2 minuti il sito è online su
   `https://marascavirginia-arch.github.io/Sito`.

### 1.3 Comprare un dominio
Un registrar qualsiasi va bene (Aruba, Namecheap, Google Workspace...).
Per un dominio `.it` conviene **Aruba.it** (economico, italiano, assistenza in italiano).
Cerca es. `simonepetrucci.it` o `avvocatopetrucci.it` e acquistalo (di solito 10-20€/anno).

### 1.4 Collegare il dominio a GitHub Pages
Nel pannello DNS del registrar, aggiungi:
- Un record **CNAME**: host `www` → valore `marascavirginia-arch.github.io`
- Quattro record **A** sul dominio "nudo" (`@`), verso gli IP di GitHub Pages:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
Poi su GitHub → Settings → Pages → "Custom domain": scrivi il tuo dominio
(es. `simonepetrucci.it`) e salva. Dopo la propagazione DNS (di solito poche ore,
a volte fino a 24-48h) attiva **"Enforce HTTPS"** quando l'opzione diventa disponibile.

---

## 2. Collegare il calendario — Microsoft Bookings

Serve un abbonamento **Microsoft 365 Business Standard** (o Premium) — quello che
include Outlook, Teams e l'app **Bookings**.

1. Vai su **outlook.office.com/bookings** → crea una nuova pagina di prenotazione.
2. In "Impostazioni pagina di prenotazione", collegala al tuo **calendario Outlook**
   (è automatico se usi lo stesso account Microsoft 365).
3. Crea due **servizi**:
   - **"Consulenza Online"** — durata 45 min. Attiva **"Aggiungi luogo online"** →
     Microsoft Teams: genera in automatico il link della videochiamata a ogni prenotazione.
   - **"Consulenza in Presenza"** — durata a scelta, nessuna riunione online.
4. In "Orari di disponibilità", imposta i giorni/orari in cui vuoi essere prenotabile.
5. Pubblica la pagina e copia il **link pubblico** di ciascun servizio
   (da ogni servizio → "..." → "Copia link di prenotazione").

**Poi mandami i due link**: li incollo io in `js/config.js` e il sito passa
automaticamente dalla simulazione attuale al calendario vero.

---

## 3. Collegare il pagamento (il tuo conto/carta)

Sempre dentro il servizio **"Consulenza Online"** di Bookings:

1. Vai alla scheda del servizio → **"Richiedi pagamento online"** → attiva.
2. Imposta il prezzo: **150€**.
3. Bookings ti chiede di collegare un provider di pagamento: scegli **Stripe**
   (il più semplice da attivare in Italia; l'alternativa è Square).
4. Se non hai già un account Stripe, te lo crea lì per lì: servono
   - i tuoi dati anagrafici e la P.IVA,
   - **IBAN** del conto su cui vuoi ricevere gli incassi,
   - un documento d'identità per la verifica (obbligatoria per legge, richiede di
     solito 1-2 giorni).
5. Una volta verificato, i pagamenti dei clienti arrivano **direttamente sul tuo conto**,
   con una piccola commissione per transazione (circa 1,5%+0,25€ per carte europee;
   di più per carte extra-UE). Non devi toccare il sito per nulla: è tutto gestito da Bookings + Stripe.

---

## 4. Ambito, descrizione e documenti — Google Form

Microsoft Bookings **non supporta l'allegato di file**, quindi per questa parte
usiamo un **Google Form** (gratuito, e i file caricati finiscono nel tuo Google Drive).

1. Vai su **forms.google.com** (con un account Google/Gmail) → crea un nuovo modulo,
   es. "Richiesta di consulenza".
2. Aggiungi tre domande:
   - **"Ambito della consulenza"** → tipo *a discesa*, con le stesse opzioni del sito
     (Diritto Civile, Successioni, Contrattualistica, Diritto Societario,
     Diritto Immobiliare, Diritto di Famiglia, Responsabilità Medica, Diritto Tributario)
     → segnala come *obbligatoria*.
   - **"Di cosa si tratta"** → tipo *paragrafo* (testo libero), facoltativa.
   - **"Documentazione"** → tipo *Caricamento file* (Google chiede di collegare
     il Drive: accetta), facoltativa.
3. In alto a destra, sulla scheda **Risposte** → icona a tre puntini →
   **"Ricevi notifiche email per le nuove risposte"**: così ogni volta che qualcuno
   compila il modulo ricevi subito un'email di avviso, e puoi anche aprire il foglio
   Google collegato per vedere tutte le risposte in ordine, con i link ai file caricati.
4. Pubblica il modulo (in alto a destra, "Invia" → copia il link).

**Poi mandami anche questo link**: sostituisco lo step "Raccontami la tua richiesta"
(oggi solo simulato) con un rimando reale a questo modulo, così le richieste ti
arrivano davvero.

---

## Riepilogo di cosa mandarmi, quando pronto

| Cosa | Dove lo trovi |
|---|---|
| Link "Consulenza Online" | Bookings → servizio → Copia link di prenotazione |
| Link "Consulenza in Presenza" | Bookings → servizio → Copia link di prenotazione |
| Link Google Form | Forms → Invia → copia link |
| Dominio acquistato (se vuoi che verifichi il DNS) | Il nome del dominio scelto |

Con questi quattro elementi il sito passa da "anteprima" a completamente funzionante,
senza bisogno di altre modifiche al codice.
