/**
 * auth.js — overlay "Sito non ancora pubblico" per la home dello studio.
 * Stessa logica dell'overlay dello Scadenzario (vedi scadenzario/js/auth.js).
 */
(function () {
  "use strict";

  const UNLOCK_KEY = "sito.unlocked.v1";
  const overlay = document.getElementById("lock-overlay");
  const form = document.getElementById("lock-form");
  const input = document.getElementById("lock-password");
  const error = document.getElementById("lock-error");

  if (!overlay) return;

  function isUnlocked() {
    try {
      return localStorage.getItem(UNLOCK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    try {
      localStorage.setItem(UNLOCK_KEY, "1");
    } catch (e) {
      // se il salvataggio fallisce, resta sbloccato solo per questa sessione
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

  setTimeout(() => input && input.focus(), 50);
})();
