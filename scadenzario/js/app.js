/**
 * app.js — wiring dell'interfaccia dello Scadenzario.
 */
(function () {
  "use strict";
  const DU = window.DateUtils;
  const RITI = window.RITI;
  const Store = window.Store;
  const Cal = window.CalendarSync;

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
  const elGoogleStatus = document.getElementById("google-status");

  let currentPreviewItems = null;

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
    renderPratiche();
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

  elSearch.addEventListener("input", renderPratiche);

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
        renderPratiche();
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
        title: `[${pratica.cliente}] ${it.label}`,
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
    const pratica = Store.get(toggle.dataset.pratica);
    if (!pratica) return;
    const completate = Object.assign({}, pratica.completate);
    if (toggle.checked) completate[toggle.dataset.label] = true;
    else delete completate[toggle.dataset.label];
    Store.update(pratica.id, { completate });
    renderPratiche();
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

  async function syncPraticaToGoogle(pratica, btn) {
    if (!Cal.isConfigured()) {
      alert("Configura prima js/calendar-config.js con il tuo Google Client ID (vedi README in scadenzario/).");
      return;
    }
    const items = computeItemsForPratica(pratica);
    const events = items.map((it) => ({
      title: `[${pratica.cliente}] ${it.label}`,
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
          title: `[${pratica.cliente}] ${it.label}`,
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
          title: `[${pratica.cliente}] ${it.label}`,
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
        renderPratiche();
      } catch (err) {
        alert("File di backup non valido: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------------------------------------------------------------
  refreshGoogleStatus();
  renderPratiche();
})();
