/**
 * store.js
 * ------------------------------------------------------------------
 * Persistenza locale (localStorage) di clienti e pratiche.
 * Nessun backend: i dati restano nel browser di chi usa l'app.
 * È disponibile un export/import JSON per fare backup o spostare i
 * dati su un altro dispositivo.
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  const KEY = "scadenzario.pratiche.v1";

  function uid() {
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
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
    const record = Object.assign(
      {
        id: uid(),
        creatoIl: new Date().toISOString(),
        completate: {}, // { deadlineLabel: true }
      },
      pratica
    );
    pratiche.push(record);
    saveAll(pratiche);
    return record;
  }

  function update(id, patch) {
    const pratiche = loadAll();
    const idx = pratiche.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    pratiche[idx] = Object.assign({}, pratiche[idx], patch);
    saveAll(pratiche);
    return pratiche[idx];
  }

  function remove(id) {
    const pratiche = loadAll().filter((p) => p.id !== id);
    saveAll(pratiche);
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
    return added;
  }

  global.Store = { loadAll, saveAll, create, update, remove, get, exportJSON, importJSON };
})(window);
