/**
 * drive-sync.js
 * ------------------------------------------------------------------
 * Sincronizza le pratiche tra dispositivi tramite un file nascosto
 * ("pratiche.json") nella cartella dati-app di Google Drive
 * dell'utente collegato — invisibile nel Drive normale, accessibile
 * solo a questa app.
 *
 * Non è un vero backend multi-utente: è pensato per un solo studio/
 * professionista che apre l'app da più dispositivi con lo stesso
 * account Google. Il conflitto tra due modifiche alla stessa pratica
 * si risolve tenendo la più recente (campo updatedAt) — vedi
 * Store.mergeRemote in store.js.
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  const FILE_NAME = "pratiche.json";
  const CONNECTED_KEY = "scadenzario.drive.connected";
  const FILE_ID_KEY = "scadenzario.drive.fileId";

  let statusCallback = null;
  let pushTimer = null;

  function setStatus(state, message) {
    if (statusCallback) statusCallback({ state, message, email: global.GoogleAuth && global.GoogleAuth.getEmail() });
  }

  function onStatus(cb) {
    statusCallback = cb;
  }

  function isConfigured() {
    return global.GoogleAuth ? global.GoogleAuth.isConfigured() : false;
  }

  function isConnected() {
    try {
      return localStorage.getItem(CONNECTED_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function getFileIdCached() {
    try {
      return localStorage.getItem(FILE_ID_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function setFileIdCached(id) {
    try {
      if (id) localStorage.setItem(FILE_ID_KEY, id);
    } catch (e) {
      /* localStorage non disponibile: si ritroverà il file cercandolo di nuovo */
    }
  }

  async function findFileId(token) {
    const cached = getFileIdCached();
    if (cached) return cached;
    const q = encodeURIComponent(`name='${FILE_NAME}'`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Impossibile cercare il file su Drive (HTTP ${res.status}).`);
    const data = await res.json();
    const file = data.files && data.files[0];
    if (file) setFileIdCached(file.id);
    return file ? file.id : null;
  }

  async function readFile(token, fileId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Impossibile leggere il file su Drive (HTTP ${res.status}).`);
    const text = await res.text();
    try {
      const parsed = JSON.parse(text || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  async function createFile(token, dataArray) {
    const boundary = "scadenzario-boundary-314159265358979";
    const metadata = { name: FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" };
    const body =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(dataArray) +
      `\r\n--${boundary}--`;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) throw new Error(`Impossibile creare il file su Drive (HTTP ${res.status}).`);
    const data = await res.json();
    setFileIdCached(data.id);
    return data.id;
  }

  async function updateFile(token, fileId, dataArray) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataArray),
    });
    if (!res.ok) throw new Error(`Impossibile aggiornare il file su Drive (HTTP ${res.status}).`);
  }

  async function writeAll(token, dataArray) {
    let fileId = getFileIdCached() || (await findFileId(token));
    if (fileId) {
      await updateFile(token, fileId, dataArray);
    } else {
      await createFile(token, dataArray);
    }
  }

  /**
   * Scarica il file da Drive (se esiste), lo unisce con le pratiche
   * locali, salva il risultato in locale e lo riscrive su Drive.
   */
  async function pullMergePush(token) {
    const fileId = await findFileId(token);
    const remote = fileId ? await readFile(token, fileId) : [];
    const { merged } = global.Store.mergeRemote(remote);
    await writeAll(token, merged);
    return merged;
  }

  async function connect() {
    if (!isConfigured()) throw new Error("Sincronizzazione non configurata: manca il Client ID Google in js/calendar-config.js.");
    setStatus("syncing", "Connessione a Google in corso…");
    try {
      const token = await global.GoogleAuth.ensureToken({ interactive: true });
      await pullMergePush(token);
      try {
        localStorage.setItem(CONNECTED_KEY, "1");
      } catch (e) {
        /* la sincronizzazione funzionerà comunque solo per questa sessione */
      }
      setStatus("synced", "Sincronizzato");
      schedulePushOnChange();
    } catch (e) {
      setStatus("error", e.message);
      throw e;
    }
  }

  async function syncNow({ interactive = true } = {}) {
    if (!isConfigured()) return;
    setStatus("syncing", "Sincronizzazione in corso…");
    try {
      const token = await global.GoogleAuth.ensureToken({ interactive });
      await pullMergePush(token);
      setStatus("synced", "Sincronizzato");
    } catch (e) {
      setStatus("error", e.message);
    }
  }

  function disconnect() {
    try {
      localStorage.removeItem(CONNECTED_KEY);
      localStorage.removeItem(FILE_ID_KEY);
    } catch (e) {
      /* niente da fare se lo storage non è disponibile */
    }
    setStatus("idle", "Sincronizzazione disattivata su questo dispositivo.");
  }

  function schedulePush() {
    if (!isConnected() || !isConfigured()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try {
        const token = await global.GoogleAuth.ensureToken({ interactive: false });
        await writeAll(token, global.Store.loadAll());
        setStatus("synced", "Sincronizzato");
      } catch (e) {
        // niente popup automatici per un push in background: si segnala solo lo stato
        setStatus("error", "Sincronizzazione automatica non riuscita: tocca \"Sincronizza ora\".");
      }
    }, 1500);
  }

  let listenerRegistered = false;
  function schedulePushOnChange() {
    if (listenerRegistered) return;
    listenerRegistered = true;
    global.Store.onChange(schedulePush);
  }

  // Se il dispositivo risulta già connesso da una sessione precedente,
  // prova un aggancio silenzioso all'avvio (nessun popup): se fallisce
  // (es. consenso scaduto), l'utente dovrà toccare "Sincronizza ora".
  function tryAutoConnect() {
    if (!isConfigured() || !isConnected()) return;
    schedulePushOnChange();
    syncNow({ interactive: false });
  }

  global.DriveSync = { isConfigured, isConnected, connect, syncNow, disconnect, onStatus, tryAutoConnect };
})(window);
