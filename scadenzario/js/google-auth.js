/**
 * google-auth.js
 * ------------------------------------------------------------------
 * Login Google condiviso tra le funzioni che ne hanno bisogno:
 * esportazione/sincronizzazione su Google Calendar (calendar.js) e
 * sincronizzazione delle pratiche su Google Drive (drive-sync.js).
 *
 * Un solo accesso Google copre entrambe le funzioni: un solo popup di
 * autorizzazione, non uno per ciascuna.
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  // Ambiti richiesti:
  // - calendar.events: creare eventi sul calendario (non leggere il resto del calendario)
  // - drive.appdata: una cartella nascosta di Drive, invisibile altrove,
  //   dedicata solo ai dati di questa app (non l'intero Drive dell'utente)
  // - userinfo.email: solo per mostrare "connesso come nome@gmail.com"
  const SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  let gisLoaded = false;
  let tokenClient = null;
  let accessToken = null;
  let userEmail = null;

  function isConfigured() {
    return !!(global.CALENDAR_CONFIG && global.CALENDAR_CONFIG.googleClientId);
  }

  function loadGisScript() {
    return new Promise((resolve, reject) => {
      if (gisLoaded && global.google && global.google.accounts) return resolve();
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        gisLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Impossibile caricare Google Identity Services."));
      document.head.appendChild(script);
    });
  }

  /**
   * Richiede (o riusa, se ancora valido) un access token con tutti gli
   * ambiti necessari. `interactive: false` prova un rinnovo silenzioso
   * (nessun popup): utile per riconnettersi in automatico all'apertura
   * dell'app se l'utente ha già dato il consenso in questa sessione del
   * browser; se fallisce, va richiesto di nuovo con `interactive: true`.
   */
  function ensureToken({ interactive = true } = {}) {
    return new Promise((resolve, reject) => {
      if (!isConfigured()) {
        reject(new Error("Accesso Google non configurato: imposta googleClientId in js/calendar-config.js."));
        return;
      }
      loadGisScript()
        .then(() => {
          if (accessToken) {
            resolve(accessToken);
            return;
          }
          if (!tokenClient) {
            tokenClient = global.google.accounts.oauth2.initTokenClient({
              client_id: global.CALENDAR_CONFIG.googleClientId,
              scope: SCOPES,
              callback: () => {},
            });
          }
          tokenClient.callback = (resp) => {
            if (resp.error) {
              reject(new Error("Autorizzazione Google negata o annullata."));
              return;
            }
            accessToken = resp.access_token;
            fetchEmail(accessToken).catch(() => {});
            resolve(accessToken);
          };
          try {
            tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "none" });
          } catch (e) {
            reject(e);
          }
        })
        .catch(reject);
    });
  }

  async function fetchEmail(token) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        userEmail = data.email || null;
      }
    } catch (e) {
      /* non essenziale: se fallisce restiamo senza email da mostrare */
    }
  }

  function getEmail() {
    return userEmail;
  }

  function isSignedIn() {
    return !!accessToken;
  }

  function signOut() {
    if (accessToken && global.google && global.google.accounts) {
      global.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    userEmail = null;
  }

  global.GoogleAuth = { isConfigured, ensureToken, getEmail, isSignedIn, signOut };
})(window);
