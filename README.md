# Sito — Avv. Simone Petrucci

Sito statico (HTML/CSS/JS, nessuna build necessaria) per lo studio digitale
dell'Avv. Simone Petrucci, civilista a Roma.

## Struttura

```
index.html          Pagina unica del sito
css/style.css        Stili
js/main.js           Interazioni (menu, animazioni, modale prenotazione)
js/config.js         Link di prenotazione (vedi sotto)
assets/img/          Logo e foto
```

## Anteprima locale

Qualsiasi server statico va bene, ad esempio:

```
python3 -m http.server 8000
```

poi apri `http://localhost:8000`.

## Attivare le prenotazioni (online + in presenza)

Il sito è pronto per collegarsi a **Microsoft Bookings**, che si integra
nativamente con calendario Outlook/Teams e supporta il pagamento con carta
(tramite il connettore Stripe o Square) senza bisogno di un backend
personalizzato.

1. Su [outlook.office.com/bookings](https://outlook.office.com/bookings)
   crea una pagina di prenotazione collegata al calendario.
2. Crea due servizi:
   - **Consulenza Online** — durata 45 minuti, prezzo 150€, "Richiedi
     pagamento online" attivo, "Aggiungi riunione online" (Teams) attivo.
   - **Consulenza in Presenza** — durata a scelta, nessun pagamento online.
3. Copia il link pubblico di prenotazione di ciascun servizio (Bookings
   permette di generare un link diretto al singolo servizio).
4. Incolla i due link in `js/config.js`:

```js
window.BOOKING_CONFIG = {
  onlineConsultationUrl: "https://outlook.office.com/book/....",
  inPersonConsultationUrl: "https://outlook.office.com/book/....",
  onlineConsultationPrice: "150",
};
```

Finché i link restano `"#"`, il pulsante di prenotazione mostra un invito a
scrivere via email/telefono, così il sito resta sempre funzionante anche
prima di attivare Bookings.

> Nota: le pagine di prenotazione di Microsoft Bookings non sono incorporabili
> in un iframe (per policy di sicurezza Microsoft), per questo si aprono in
> una nuova scheda: è il comportamento standard consigliato da Microsoft.

## Contenuti da personalizzare

- `assets/img/logo.png` — logo (monogramma SP)
- `assets/img/simone-petrucci.jpg` — foto sezione "Chi Sono"
- Email e telefono sono nella sezione `#contatti` di `index.html`
