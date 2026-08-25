/**
 * Blocco d'accesso temporaneo per il sito, finché non è pronto per il
 * pubblico. NON è una vera misura di sicurezza (il repository è
 * pubblico): serve solo a evitare che chi trova il link per caso veda
 * il sito prima del lancio.
 *
 * La password non è scritta qui in chiaro: è salvata come impronta
 * (hash SHA-256). Per cambiarla, chiedi a Claude di calcolare il
 * nuovo hash e aggiornare questo file. Per togliere del tutto il
 * blocco quando il sito è pronto per il pubblico, chiedi a Claude di
 * rimuovere l'overlay da index.html.
 */
window.AUTH_CONFIG = {
  passwordHashSHA256: "d65021fe53b7b0f62d1c5953ebe0d18f82888c91a426b59cf55d1b1a0c93a6cb",
};
