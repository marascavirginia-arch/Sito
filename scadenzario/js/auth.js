/**
 * auth.js — gestisce l'overlay "Accesso riservato".
 *
 * Deve essere caricato PRIMA degli altri script (subito dopo il markup
 * dell'overlay nel <body>), così l'overlay è già visibile prima ancora
 * che il resto della pagina venga interpretato: nessun lampo di
 * contenuto sbloccato.
 */
(function () {
  "use strict";

  const UNLOCK_KEY = "scadenzario.unlocked.v1";
  const overlay = document.getElementById("lock-overlay");
  const form = document.getElementById("lock-form");
  const input = document.getElementById("lock-password");
  const error = document.getElementById("lock-error");

  if (!overlay) return; // markup mancante: non blocchiamo l'app per un errore di configurazione

  function isUnlocked() {
    try {
      return localStorage.getItem(UNLOCK_KEY) === "1";
    } catch (e) {
      return false; // storage non disponibile (es. modalità privata restrittiva): richiedi comunque la password
    }
  }

  function unlock() {
    try {
      localStorage.setItem(UNLOCK_KEY, "1");
    } catch (e) {
      // se il salvataggio fallisce, l'app resta comunque sbloccata per questa sessione;
      // verrà richiesta di nuovo la password al prossimo caricamento
    }
    overlay.remove();
  }

  if (isUnlocked()) {
    overlay.remove();
    return;
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = input.value;
    if (!value) return;
    error.hidden = true;
    let hash;
    try {
      hash = await sha256Hex(value);
    } catch (err) {
      // crypto.subtle richiede un contesto sicuro (https o localhost).
      error.textContent = "Impossibile verificare la password su questa connessione (serve una pagina https).";
      error.hidden = false;
      return;
    }
    if (window.AUTH_CONFIG && hash === window.AUTH_CONFIG.passwordHashSHA256) {
      unlock();
    } else {
      error.textContent = "Password errata. Riprova.";
      error.hidden = false;
      input.value = "";
      input.focus();
    }
  });

  // focus automatico sul campo password all'apertura
  setTimeout(() => input && input.focus(), 50);
})();
