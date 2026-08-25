/**
 * Configurazione sincronizzazione con Google Calendar.
 *
 * La modalità "Esporta .ics" funziona sempre, senza alcuna
 * configurazione: genera un file da importare in Google Calendar
 * (o qualsiasi altro calendario) in un solo passaggio.
 *
 * La modalità "Sincronizza con Google Calendar" (un click, senza
 * scaricare/importare nulla) richiede invece un Client ID OAuth di
 * Google, da creare una tantum. Istruzioni in scadenzario/README.md.
 *
 * Finché GOOGLE_CLIENT_ID resta "", il pulsante di sincronizzazione
 * diretta resta disattivato e l'app mostra solo l'esportazione .ics.
 */
window.CALENDAR_CONFIG = {
  googleClientId: "26598840794-q7n4ksnmij0e7dnac81fhp4ehct69c7m.apps.googleusercontent.com",
  // ID del calendario Google su cui creare gli eventi ("primary" = il
  // calendario principale dell'account collegato, oppure l'indirizzo
  // di un calendario dedicato es. "xxxx@group.calendar.google.com").
  googleCalendarId: "primary",
};
