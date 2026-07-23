/**
 * Configurazione prenotazioni.
 *
 * Collega qui le pagine di prenotazione create con Microsoft Bookings
 * (consigliato: si integra nativamente con il calendario/Teams e supporta
 * il pagamento con carta tramite il connettore Stripe o Square).
 *
 * Come attivare:
 * 1. Crea una pagina Microsoft Bookings collegata al calendario Outlook/Teams.
 * 2. Crea due servizi:
 *    - "Consulenza Online" — 45 min, prezzo 150€, pagamento online richiesto,
 *      riunione Teams generata automaticamente.
 *    - "Consulenza in Presenza" — durata a scelta, nessun pagamento online.
 * 3. Copia il link pubblico di prenotazione di ciascun servizio qui sotto
 *    (Bookings permette di generare un link diretto al singolo servizio).
 *
 * Finché i link restano "#", il sito mostra un avviso e invita a contattare
 * l'avvocato via email/telefono, invece di aprire un link inesistente.
 */
window.BOOKING_CONFIG = {
  onlineConsultationUrl: "#",
  inPersonConsultationUrl: "#",
  onlineConsultationPrice: "150",
};
