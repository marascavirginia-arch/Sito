/**
 * app.js — wiring dell'interfaccia dello Scadenzario.
 */
(function () {
  "use strict";
  const DU = window.DateUtils;
  const RITI = window.RITI;
  const Store = window.Store;
  const Cal = window.CalendarSync;
  const Drive = window.DriveSync;

  const CATEGORY_LABELS = {
    introduzione: "Introduzione",
    cautelare: "Cautelare",
    merito: "Merito",
    impugnazione: "Impugnazione",
  };

  const elRito = document.getElementById("f-rito");
  const elSottotipo = document.getElementById("f-sottotipo");
  const elDynamicFields = document.getElementById("dynamic-fields");
  const elForm = document.getElementById("form-pratica");
  const elPreviewResult = document.getElementById("preview-result");
  const elPreviewList = document.getElementById("preview-list");
  const elBtnSalva = document.getElementById("btn-salva-pratica");
  const elPraticheList = document.getElementById("pratiche-list");
  const elEmptyState = document.getElementById("empty-state");
  const elSearch = document.getElementById("f-search");
  const elNascondiFatte = document.getElementById("f-nascondi-fatte");
  const elRiepilogoBody = document.getElementById("riepilogo-body");
  const elRiepilogoEmpty = document.getElementById("riepilogo-empty");
  const elRegistroBody = document.getElementById("registro-body");
  const elRegistroEmpty = document.getElementById("registro-empty");
  const elGoogleStatus = document.getElementById("google-status");
  const elDriveSyncBtn = document.getElementById("btn-drive-sync");
  const elDriveDisconnectBtn = document.getElementById("btn-drive-disconnect");
  const elDriveStatus = document.getElementById("drive-status");

  let currentPreviewItems = null;
  const noteSaveTimers = {};

  // ---------------------------------------------------------------
  // Popolamento select Rito / Sottotipo
  // ---------------------------------------------------------------
  Object.keys(RITI).forEach((ritoKey) => {
    const opt = document.createElement("option");
    opt.value = ritoKey;
    opt.textContent = RITI[ritoKey].label;
    elRito.appendChild(opt);
  });

  elRito.addEventListener("change", () => {
    const rito = RITI[elRito.value];
    elSottotipo.innerHTML = "";
    elDynamicFields.innerHTML = "";
    elPreviewResult.hidden = true;
    if (!rito) {
      elSottotipo.disabled = true;
      elSottotipo.innerHTML = '<option value="">Seleziona prima il rito…</option>';
      return;
    }
    elSottotipo.disabled = false;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Seleziona…";
    elSottotipo.appendChild(placeholder);
    Object.keys(rito.sottotipi).forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = rito.sottotipi[key].label;
      elSottotipo.appendChild(opt);
    });
  });

  elSottotipo.addEventListener("change", () => {
    renderDynamicFields();
  });

  function currentSottotipo() {
    const rito = RITI[elRito.value];
    if (!rito) return null;
    return rito.sottotipi[elSottotipo.value] || null;
  }

  function renderDynamicFields() {
    elDynamicFields.innerHTML = "";
    elPreviewResult.hidden = true;
    const sottotipo = currentSottotipo();
    if (!sottotipo) return;
    sottotipo.fields.forEach((f) => {
      const wrap = document.createElement("div");
      wrap.className = "field" + (f.type === "checkbox" ? " field-checkbox" : "");

      const input = document.createElement("input");
      input.id = "dyn-" + f.key;
      input.dataset.key = f.key;
      input.dataset.type = f.type;

      if (f.type === "select") {
        const select = document.createElement("select");
        select.id = "dyn-" + f.key;
        select.dataset.key = f.key;
        select.dataset.type = "select";
        (f.options || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.label;
          select.appendChild(opt);
        });
        if (f.required) select.required = true;
        const label = document.createElement("label");
        label.htmlFor = select.id;
        label.textContent = f.label + (f.required ? "" : " (opzionale)");
        wrap.appendChild(label);
        wrap.appendChild(select);
      } else if (f.type === "checkbox") {
        input.type = "checkbox";
        const label = document.createElement("label");
        label.htmlFor = input.id;
        label.textContent = f.label;
        wrap.appendChild(input);
        wrap.appendChild(label);
      } else {
        input.type = f.type === "number" ? "number" : "date";
        if (f.required) input.required = true;
        const label = document.createElement("label");
        label.htmlFor = input.id;
        label.textContent = f.label + (f.required ? "" : " (opzionale)");
        wrap.appendChild(label);
        wrap.appendChild(input);
      }

      if (f.help) {
        const help = document.createElement("div");
        help.className = "help";
        help.textContent = f.help;
        wrap.appendChild(help);
      }

      elDynamicFields.appendChild(wrap);
    });
  }

  function readDynamicValues() {
    const values = {};
    elDynamicFields.querySelectorAll("[data-key]").forEach((el) => {
      const key = el.dataset.key;
      const type = el.dataset.type;
      if (type === "checkbox") values[key] = el.checked;
      else if (type === "number") values[key] = el.value === "" ? null : Number(el.value);
      else values[key] = el.value || null;
    });
    return values;
  }

  // ---------------------------------------------------------------
  // Calcolo scadenze (submit del form)
  // ---------------------------------------------------------------
  elForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const sottotipo = currentSottotipo();
    if (!sottotipo) return;
    const values = readDynamicValues();
    let items;
    try {
      items = sottotipo.compute(values);
    } catch (err) {
      console.error(err);
      alert("Errore nel calcolo delle scadenze: verificare le date inserite.");
      return;
    }
    items = (items || []).filter(Boolean).sort((a, b) => a.date - b.date);
    currentPreviewItems = items;
    elPreviewList.innerHTML = renderDeadlineItems(items, {});
    elPreviewResult.hidden = items.length === 0;
    if (items.length === 0) {
      alert("Nessuna scadenza calcolabile con i dati inseriti: compila i campi facoltativi (es. data udienza) per ottenere il calcolo completo.");
    }
  });

  elBtnSalva.addEventListener("click", () => {
    if (!currentPreviewItems || currentPreviewItems.length === 0) return;
    const cliente = document.getElementById("f-cliente").value.trim();
    const oggetto = document.getElementById("f-oggetto").value.trim();
    if (!cliente) {
      alert("Inserisci il nominativo del cliente.");
      return;
    }
    const ritoKey = elRito.value;
    const sottotipoKey = elSottotipo.value;
    const values = readDynamicValues();
    Store.create({
      cliente,
      oggetto,
      ritoKey,
      sottotipoKey,
      values,
    });
    elForm.reset();
    elSottotipo.innerHTML = '<option value="">Seleziona prima il rito…</option>';
    elSottotipo.disabled = true;
    elDynamicFields.innerHTML = "";
    elPreviewResult.hidden = true;
    currentPreviewItems = null;
    renderAll();
  });

  // ---------------------------------------------------------------
  // Rendering elenco scadenze (usato sia in anteprima che nelle card)
  // ---------------------------------------------------------------
  function renderDeadlineItems(items, { pratica, editable } = {}) {
    const today = DU.toDate(new Date());
    const soonThreshold = DU.addDays(today, 7);
    return items
      .map((it) => {
        const isDone = pratica && pratica.completate && pratica.completate[it.label];
        let statusClass = "";
        if (isDone) statusClass = "done";
        else if (it.date < today) statusClass = "overdue";
        else if (it.date <= soonThreshold) statusClass = "soon";
        const checkbox =
          editable && pratica
            ? `<label class="d-check"><input type="checkbox" data-toggle-done data-pratica="${pratica.id}" data-label="${escapeHTML(it.label)}" ${isDone ? "checked" : ""}/> fatto</label>`
            : "";
        return `
        <li class="deadline-item ${statusClass}">
          <div class="d-date">${DU.formatItShort(it.date)}</div>
          <div>
            <div class="d-label">${escapeHTML(it.label)}</div>
            ${it.art ? `<div class="d-art">${escapeHTML(it.art)}</div>` : ""}
            ${it.note ? `<div class="d-note">${escapeHTML(it.note)}</div>` : ""}
          </div>
          <div>
            <span class="d-cat">${CATEGORY_LABELS[it.category] || it.category}</span>
            ${checkbox}
          </div>
        </li>`;
      })
      .join("");
  }

  function escapeHTML(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------------------------------------------------------
  // Elenco pratiche salvate
  // ---------------------------------------------------------------
  function computeItemsForPratica(pratica) {
    const rito = RITI[pratica.ritoKey];
    const sottotipo = rito && rito.sottotipi[pratica.sottotipoKey];
    if (!sottotipo) return [];
    try {
      return (sottotipo.compute(pratica.values) || []).filter(Boolean).sort((a, b) => a.date - b.date);
    } catch (e) {
      console.error("Errore nel calcolo delle scadenze per la pratica", pratica.id, e);
      return [];
    }
  }

  function nextDeadlineText(items, pratica) {
    const today = DU.toDate(new Date());
    const pending = items.filter((it) => !(pratica.completate && pratica.completate[it.label]));
    const next = pending.find((it) => it.date >= today) || pending[0];
    if (!next) return "Nessuna scadenza calcolabile";
    const overdue = next.date < today;
    return `${overdue ? "Scaduta" : "Prossima"}: ${next.label} — ${DU.formatItShort(next.date)}`;
  }

  function renderPratiche() {
    const all = Store.loadAll();
    const query = (elSearch.value || "").trim().toLowerCase();
    const filtered = query
      ? all.filter((p) => (p.cliente || "").toLowerCase().includes(query) || (p.oggetto || "").toLowerCase().includes(query))
      : all;

    elEmptyState.hidden = all.length > 0;
    elPraticheList.innerHTML = "";
    if (all.length === 0) {
      elPraticheList.appendChild(elEmptyState);
      return;
    }

    // ordina per prossima scadenza
    const withItems = filtered.map((p) => ({ pratica: p, items: computeItemsForPratica(p) }));
    withItems.sort((a, b) => {
      const today = DU.toDate(new Date());
      const na = a.items.find((it) => it.date >= today) || a.items[0];
      const nb = b.items.find((it) => it.date >= today) || b.items[0];
      if (!na && !nb) return 0;
      if (!na) return 1;
      if (!nb) return -1;
      return na.date - nb.date;
    });

    withItems.forEach(({ pratica, items }) => {
      const rito = RITI[pratica.ritoKey];
      const sottotipo = rito && rito.sottotipi[pratica.sottotipoKey];
      const card = document.createElement("div");
      card.className = "pratica-card";
      card.innerHTML = `
        <div class="pratica-head" data-toggle-card="${pratica.id}">
          <div class="pratica-head-main">
            <strong>${escapeHTML(pratica.cliente)}</strong>
            <span>${escapeHTML(pratica.oggetto || "")}</span>
          </div>
          <span class="pratica-badge">${escapeHTML((rito && rito.label) || pratica.ritoKey)} · ${escapeHTML((sottotipo && sottotipo.label) || pratica.sottotipoKey)}</span>
          <span class="pratica-next">${escapeHTML(nextDeadlineText(items, pratica))}</span>
        </div>
        <div class="pratica-body" id="body-${pratica.id}">
          <ul class="deadline-list">${renderDeadlineItems(items, { pratica, editable: true })}</ul>
          <div class="pratica-notes">
            <label for="note-${pratica.id}">Note personalizzate</label>
            <textarea id="note-${pratica.id}" data-note-pratica="${pratica.id}" placeholder="Es. in attesa di documenti dal cliente; verificare con controparte entro venerdì…">${escapeHTML(pratica.note || "")}</textarea>
            <p class="note-status" data-note-status="${pratica.id}"></p>
          </div>
          <div class="pratica-actions">
            <button type="button" class="btn btn-outline btn-sm" data-export-ics="${pratica.id}">Esporta .ics</button>
            <button type="button" class="btn btn-outline btn-sm" data-sync-google="${pratica.id}">Sincronizza con Google Calendar</button>
            <button type="button" class="btn btn-ghost btn-sm" data-delete-pratica="${pratica.id}">Elimina pratica</button>
          </div>
        </div>
      `;
      elPraticheList.appendChild(card);
    });
  }

  function renderAll() {
    renderPratiche();
    renderRiepilogo();
    renderRegistro();
  }

  function toggleDone(praticaId, label, checked) {
    const pratica = Store.get(praticaId);
    if (!pratica) return;
    const completate = Object.assign({}, pratica.completate);
    if (checked) completate[label] = true;
    else delete completate[label];
    Store.update(praticaId, { completate });
    renderAll();
  }

  // ---------------------------------------------------------------
  // Riepilogo: tutte le scadenze di tutte le pratiche, in un'unica
  // tabella ordinata per data.
  // ---------------------------------------------------------------
  function renderRiepilogo() {
    const all = Store.loadAll();
    const query = (elSearch.value || "").trim().toLowerCase();
    const nascondiFatte = elNascondiFatte.checked;
    const today = DU.toDate(new Date());
    const soonThreshold = DU.addDays(today, 7);

    let rows = [];
    all.forEach((pratica) => {
      if (query && !(pratica.cliente || "").toLowerCase().includes(query) && !(pratica.oggetto || "").toLowerCase().includes(query)) return;
      const rito = RITI[pratica.ritoKey];
      const sottotipo = rito && rito.sottotipi[pratica.sottotipoKey];
      computeItemsForPratica(pratica).forEach((it) => {
        const isDone = !!(pratica.completate && pratica.completate[it.label]);
        if (nascondiFatte && isDone) return;
        rows.push({ pratica, item: it, isDone, ritoLabel: (rito && rito.label) || pratica.ritoKey, sottotipoLabel: (sottotipo && sottotipo.label) || pratica.sottotipoKey });
      });
    });
    rows.sort((a, b) => a.item.date - b.item.date);

    elRiepilogoEmpty.hidden = rows.length > 0;
    elRiepilogoBody.innerHTML = rows
      .map(({ pratica, item: it, isDone, ritoLabel, sottotipoLabel }) => {
        let statusClass = "";
        if (isDone) statusClass = "done";
        else if (it.date < today) statusClass = "overdue";
        else if (it.date <= soonThreshold) statusClass = "soon";
        return `
        <tr class="${statusClass}">
          <td class="rp-date">${DU.formatItShort(it.date)}</td>
          <td>${escapeHTML(pratica.cliente)}</td>
          <td>
            <div>${escapeHTML(pratica.oggetto || "—")}</div>
            <div class="rp-oggetto">${escapeHTML(ritoLabel)} · ${escapeHTML(sottotipoLabel)}</div>
          </td>
          <td>
            <div class="rp-label">${escapeHTML(it.label)}</div>
            ${it.art ? `<div class="rp-art">${escapeHTML(it.art)}</div>` : ""}
          </td>
          <td><span class="d-cat">${CATEGORY_LABELS[it.category] || it.category}</span></td>
          <td class="rp-check"><input type="checkbox" data-toggle-done data-pratica="${pratica.id}" data-label="${escapeHTML(it.label)}" ${isDone ? "checked" : ""} aria-label="Segna come fatto" /></td>
        </tr>`;
      })
      .join("");
  }

  // ---------------------------------------------------------------
  // Registro clienti: un cliente per riga, con le info principali di
  // tutte le sue pratiche.
  // ---------------------------------------------------------------
  function renderRegistro() {
    const all = Store.loadAll();
    const today = DU.toDate(new Date());
    const soonThreshold = DU.addDays(today, 7);

    const gruppi = new Map();
    all.forEach((pratica) => {
      const chiave = (pratica.cliente || "").trim() || "(senza nome)";
      if (!gruppi.has(chiave)) gruppi.set(chiave, []);
      gruppi.get(chiave).push(pratica);
    });

    const righe = Array.from(gruppi.entries()).map(([cliente, pratiche]) => {
      const ritiLabels = new Set();
      const note = [];
      let prossima = null;

      pratiche.forEach((pratica) => {
        const rito = RITI[pratica.ritoKey];
        if (rito) ritiLabels.add(rito.label);
        if ((pratica.note || "").trim()) note.push({ oggetto: pratica.oggetto || "Pratica", testo: pratica.note.trim() });

        const items = computeItemsForPratica(pratica);
        const pending = items.filter((it) => !(pratica.completate && pratica.completate[it.label]));
        const next = pending.find((it) => it.date >= today) || pending[0];
        if (next && (!prossima || next.date < prossima.item.date)) prossima = { item: next, overdue: next.date < today };
      });

      return { cliente, pratiche, ritiLabels: Array.from(ritiLabels), note, prossima };
    });

    righe.sort((a, b) => {
      if (!a.prossima && !b.prossima) return a.cliente.localeCompare(b.cliente);
      if (!a.prossima) return 1;
      if (!b.prossima) return -1;
      return a.prossima.item.date - b.prossima.item.date;
    });

    elRegistroEmpty.hidden = righe.length > 0;
    elRegistroBody.innerHTML = righe
      .map(({ cliente, pratiche, ritiLabels, note, prossima }) => {
        let nextClass = "";
        let nextText = "Nessuna scadenza calcolabile";
        if (prossima) {
          nextClass = prossima.overdue ? "overdue" : prossima.item.date <= soonThreshold ? "soon" : "";
          nextText = `${prossima.overdue ? "Scaduta" : ""}${prossima.overdue ? " · " : ""}${prossima.item.label} — ${DU.formatItShort(prossima.item.date)}`;
        }
        const oggetti = pratiche.map((p) => escapeHTML(p.oggetto || "Pratica senza oggetto")).join(", ");
        const noteHTML = note.length
          ? note.map((n) => `<div><span class="rg-note-oggetto">${escapeHTML(n.oggetto)}:</span> ${escapeHTML(n.testo)}</div>`).join("")
          : `<span class="rg-note-empty">Nessuna nota</span>`;
        return `
        <tr data-cliente="${escapeHTML(cliente)}">
          <td class="rg-cliente">${escapeHTML(cliente)}</td>
          <td><span class="rg-count">${pratiche.length} pratic${pratiche.length === 1 ? "a" : "he"}</span><div class="rp-oggetto">${oggetti}</div></td>
          <td class="rg-rito">${escapeHTML(ritiLabels.join(", ") || "—")}</td>
          <td class="rg-next ${nextClass}">${escapeHTML(nextText)}</td>
          <td class="rg-note">${noteHTML}</td>
        </tr>`;
      })
      .join("");
  }

  elRegistroBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-cliente]");
    if (!row) return;
    elSearch.value = row.dataset.cliente;
    renderAll();
    const praticheSection = document.getElementById("pratiche-list");
    if (praticheSection) praticheSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elPraticheList.addEventListener("input", (e) => {
    const textarea = e.target.closest("[data-note-pratica]");
    if (!textarea) return;
    const praticaId = textarea.dataset.notePratica;
    const statusEl = elPraticheList.querySelector(`[data-note-status="${praticaId}"]`);
    if (statusEl) {
      statusEl.textContent = "Scrittura…";
      statusEl.classList.remove("saved");
    }
    clearTimeout(noteSaveTimers[praticaId]);
    noteSaveTimers[praticaId] = setTimeout(() => {
      Store.update(praticaId, { note: textarea.value });
      if (statusEl) {
        statusEl.textContent = "Nota salvata.";
        statusEl.classList.add("saved");
      }
      renderRegistro();
    }, 500);
  });

  elRiepilogoBody.addEventListener("change", (e) => {
    const toggle = e.target.closest("[data-toggle-done]");
    if (!toggle) return;
    toggleDone(toggle.dataset.pratica, toggle.dataset.label, toggle.checked);
  });

  elSearch.addEventListener("input", renderAll);
  elNascondiFatte.addEventListener("change", renderRiepilogo);

  elPraticheList.addEventListener("click", (e) => {
    const toggleId = e.target.closest("[data-toggle-card]");
    if (toggleId && !e.target.closest("[data-toggle-done]")) {
      const id = toggleId.dataset.toggleCard;
      const body = document.getElementById("body-" + id);
      if (body) body.classList.toggle("open");
      return;
    }

    const del = e.target.closest("[data-delete-pratica]");
    if (del) {
      if (confirm("Eliminare definitivamente questa pratica e le sue scadenze?")) {
        Store.remove(del.dataset.deletePratica);
        renderAll();
      }
      return;
    }

    const exportBtn = e.target.closest("[data-export-ics]");
    if (exportBtn) {
      const pratica = Store.get(exportBtn.dataset.exportIcs);
      if (!pratica) return;
      const items = computeItemsForPratica(pratica);
      const events = items.map((it) => ({
        uid: `${pratica.id}_${slug(it.label)}`,
        cliente: pratica.cliente,
        label: it.label,
        date: it.date,
        description: [it.art, it.note].filter(Boolean).join(" — "),
      }));
      Cal.downloadICS(events, `scadenze_${slug(pratica.cliente)}.ics`);
      return;
    }

    const syncBtn = e.target.closest("[data-sync-google]");
    if (syncBtn) {
      const pratica = Store.get(syncBtn.dataset.syncGoogle);
      if (!pratica) return;
      syncPraticaToGoogle(pratica, syncBtn);
      return;
    }
  });

  elPraticheList.addEventListener("change", (e) => {
    const toggle = e.target.closest("[data-toggle-done]");
    if (!toggle) return;
    toggleDone(toggle.dataset.pratica, toggle.dataset.label, toggle.checked);
  });

  function slug(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // ---------------------------------------------------------------
  // Google Calendar
  // ---------------------------------------------------------------
  function refreshGoogleStatus() {
    if (!Cal.isConfigured()) {
      elGoogleStatus.textContent =
        "Sincronizzazione diretta con Google Calendar non configurata. Usa \"Esporta .ics\" (funziona subito) oppure configura js/calendar-config.js — vedi README.";
      document.getElementById("btn-sync-all-google").disabled = true;
    } else {
      elGoogleStatus.textContent = "Sincronizzazione diretta con Google Calendar disponibile: al primo utilizzo verrà chiesto di collegare l'account Google.";
      document.getElementById("btn-sync-all-google").disabled = false;
    }
  }

  // ---------------------------------------------------------------
  // Sincronizzazione pratiche su Google Drive (tra dispositivi)
  // ---------------------------------------------------------------
  function refreshDriveUI() {
    if (!Drive || !Drive.isConfigured()) {
      elDriveSyncBtn.disabled = true;
      elDriveDisconnectBtn.hidden = true;
      elDriveStatus.textContent =
        "Non configurata: serve un Client ID Google in js/calendar-config.js (lo stesso usato per Google Calendar) — vedi README.";
      return;
    }
    elDriveSyncBtn.disabled = false;
    if (Drive.isConnected()) {
      elDriveSyncBtn.textContent = "Sincronizza ora";
      elDriveDisconnectBtn.hidden = false;
    } else {
      elDriveSyncBtn.textContent = "Sincronizza pratiche con Google";
      elDriveDisconnectBtn.hidden = true;
      elDriveStatus.textContent = "Non connesso: le pratiche restano solo su questo dispositivo.";
    }
  }

  if (Drive) {
    Drive.onStatus(({ state, message, email }) => {
      if (state === "syncing") {
        elDriveStatus.textContent = message || "Sincronizzazione in corso…";
      } else if (state === "synced") {
        elDriveStatus.textContent = email ? `Sincronizzato — connesso come ${email}.` : "Sincronizzato.";
        renderAll();
      } else if (state === "error") {
        elDriveStatus.textContent = message || "Errore di sincronizzazione.";
      } else {
        elDriveStatus.textContent = message || "";
      }
      refreshDriveUI();
    });

    elDriveSyncBtn.addEventListener("click", async () => {
      elDriveSyncBtn.disabled = true;
      try {
        if (Drive.isConnected()) {
          await Drive.syncNow({ interactive: true });
        } else {
          await Drive.connect();
        }
      } catch (e) {
        elDriveStatus.textContent = e.message || "Sincronizzazione non riuscita.";
      } finally {
        elDriveSyncBtn.disabled = false;
        refreshDriveUI();
      }
    });

    elDriveDisconnectBtn.addEventListener("click", () => {
      if (confirm("Disconnettere questo dispositivo dalla sincronizzazione? Le pratiche già salvate qui restano, ma non si aggiorneranno più da Google Drive.")) {
        Drive.disconnect();
        refreshDriveUI();
      }
    });
  }

  async function syncPraticaToGoogle(pratica, btn) {
    if (!Cal.isConfigured()) {
      alert("Configura prima js/calendar-config.js con il tuo Google Client ID (vedi README in scadenzario/).");
      return;
    }
    const items = computeItemsForPratica(pratica);
    const events = items.map((it) => ({
      uid: `${pratica.id}_${slug(it.label)}`,
      cliente: pratica.cliente,
      label: it.label,
      date: it.date,
      description: [it.art, it.note].filter(Boolean).join(" — "),
    }));
    await runGoogleSync(events, btn);
  }

  async function runGoogleSync(events, btn) {
    if (!events.length) {
      alert("Nessuna scadenza da sincronizzare.");
      return;
    }
    const originalText = btn.textContent;
    btn.disabled = true;
    try {
      const results = await Cal.pushEventsToGoogleCalendar(events, (done, total) => {
        btn.textContent = `Sincronizzazione… ${done}/${total}`;
      });
      const ok = results.filter((r) => r.ok).length;
      const failed = results.length - ok;
      alert(`Sincronizzazione completata: ${ok} eventi creati su Google Calendar${failed ? `, ${failed} falliti` : ""}.`);
    } catch (e) {
      alert("Errore nella sincronizzazione con Google Calendar: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  document.getElementById("btn-export-all-ics").addEventListener("click", () => {
    const all = Store.loadAll();
    const events = [];
    all.forEach((pratica) => {
      computeItemsForPratica(pratica).forEach((it) => {
        events.push({
          uid: `${pratica.id}_${slug(it.label)}`,
          cliente: pratica.cliente,
          label: it.label,
          date: it.date,
          description: [it.art, it.note].filter(Boolean).join(" — "),
        });
      });
    });
    if (!events.length) {
      alert("Nessuna scadenza da esportare.");
      return;
    }
    Cal.downloadICS(events, "scadenze_studio.ics");
  });

  document.getElementById("btn-sync-all-google").addEventListener("click", async (e) => {
    const all = Store.loadAll();
    const events = [];
    all.forEach((pratica) => {
      computeItemsForPratica(pratica).forEach((it) => {
        events.push({
          uid: `${pratica.id}_${slug(it.label)}`,
          cliente: pratica.cliente,
          label: it.label,
          date: it.date,
          description: [it.art, it.note].filter(Boolean).join(" — "),
        });
      });
    });
    await runGoogleSync(events, e.currentTarget);
  });

  document.getElementById("btn-export-backup").addEventListener("click", () => {
    const json = Store.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scadenzario_backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.getElementById("input-import-backup").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const added = Store.importJSON(reader.result, { merge: true });
        alert(`Importazione completata: ${added} pratiche aggiunte.`);
        renderAll();
      } catch (err) {
        alert("File di backup non valido: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------------------------------------------------------------
  refreshGoogleStatus();
  refreshDriveUI();
  renderAll();
  if (Drive) Drive.tryAutoConnect();
})();
