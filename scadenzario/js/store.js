/**
 * store.js
 * ------------------------------------------------------------------
 * Persistenza locale (localStorage) di clienti e pratiche.
 * Nessun backend obbligatorio: i dati restano nel browser di chi usa
 * l'app. È disponibile un export/import JSON per fare backup o
 * spostare i dati su un altro dispositivo, e (opzionale) una
 * sincronizzazione automatica su Google Drive — vedi drive-sync.js.
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  const KEY = "scadenzario.pratiche.v1";

  let onChangeCallback = null;

  function uid() {
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function notifyChange() {
    if (onChangeCallback) onChangeCallback();
  }

  /** Registra una funzione chiamata dopo ogni modifica locale (create/update/remove). Usata da drive-sync.js per il push automatico. */
  function onChange(cb) {
    onChangeCallback = cb;
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Errore nel caricamento delle pratiche", e);
      return [];
    }
  }

  function saveAll(pratiche) {
    localStorage.setItem(KEY, JSON.stringify(pratiche));
  }

  function create(pratica) {
    const pratiche = loadAll();
    const now = new Date().toISOString();
    const record = Object.assign(
      {
        id: uid(),
        creatoIl: now,
        updatedAt: now,
        completate: {}, // { deadlineLabel: true }
        note: "",
      },
      pratica
    );
    pratiche.push(record);
    saveAll(pratiche);
    notifyChange();
    return record;
  }

  function update(id, patch) {
    const pratiche = loadAll();
    const idx = pratiche.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    pratiche[idx] = Object.assign({}, pratiche[idx], patch, { updatedAt: new Date().toISOString() });
    saveAll(pratiche);
    notifyChange();
    return pratiche[idx];
  }

  function remove(id) {
    const pratiche = loadAll().filter((p) => p.id !== id);
    saveAll(pratiche);
    notifyChange();
  }

  function get(id) {
    return loadAll().find((p) => p.id === id) || null;
  }

  function exportJSON() {
    return JSON.stringify(loadAll(), null, 2);
  }

  function importJSON(text, { merge = true } = {}) {
    const incoming = JSON.parse(text);
    if (!Array.isArray(incoming)) throw new Error("File non valido: atteso un elenco di pratiche.");
    if (!merge) {
      saveAll(incoming);
      notifyChange();
      return incoming.length;
    }
    const existing = loadAll();
    const existingIds = new Set(existing.map((p) => p.id));
    let added = 0;
    incoming.forEach((p) => {
      if (!existingIds.has(p.id)) {
        existing.push(p);
        added++;
      }
    });
    saveAll(existing);
    notifyChange();
    return added;
  }

  /**
   * Unisce un elenco di pratiche arrivato da un'altra fonte (es. Google
   * Drive) con quelle locali. Per ogni pratica presente su entrambi i
   * lati, vince quella modificata più di recente (campo updatedAt).
   * Non gestisce le cancellazioni: una pratica cancellata su un
   * dispositivo può ricomparire se un altro dispositivo, non ancora
   * sincronizzato, la ripropone in un merge successivo — limite noto
   * di questa prima versione della sincronizzazione.
   */
  function mergeRemote(remoteList) {
    if (!Array.isArray(remoteList)) return loadAll();
    const local = loadAll();
    const byId = new Map(local.map((p) => [p.id, p]));
    let changed = false;
    remoteList.forEach((r) => {
      if (!r || !r.id) return;
      const existing = byId.get(r.id);
      if (!existing) {
        byId.set(r.id, r);
        changed = true;
      } else {
        const rTime = Date.parse(r.updatedAt || r.creatoIl || 0) || 0;
        const eTime = Date.parse(existing.updatedAt || existing.creatoIl || 0) || 0;
        if (rTime > eTime) {
          byId.set(r.id, r);
          changed = true;
        }
      }
    });
    const merged = Array.from(byId.values());
    if (changed) saveAll(merged);
    return { merged, changed };
  }

  global.Store = { loadAll, saveAll, create, update, remove, get, exportJSON, importJSON, mergeRemote, onChange };
})(window);
