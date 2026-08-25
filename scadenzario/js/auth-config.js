/**
 * Blocco d'accesso semplice per lo Scadenzario.
 *
 * NON è una vera misura di sicurezza: il repository è pubblico, quindi
 * chiunque sappia leggere questo file può risalire alla password con
 * un minimo di impegno. Serve solo a impedire che chi apre il link per
 * caso o per curiosità veda l'app: un lucchetto sulla porta di casa,
 * non una cassaforte.
 *
 * La password NON è scritta qui in chiaro: è salvata come "impronta"
 * (hash SHA-256), impossibile da leggere a colpo d'occhio.
 *
 * Per cambiare la password, chiedi a Claude di calcolare il nuovo hash
 * e aggiornare questo file.
 */
window.AUTH_CONFIG = {
  passwordHashSHA256: "d65021fe53b7b0f62d1c5953ebe0d18f82888c91a426b59cf55d1b1a0c93a6cb",
};
