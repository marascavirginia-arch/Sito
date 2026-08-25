/**
 * riti.js
 * ------------------------------------------------------------------
 * Definizione dei riti (civile, amministrativo, tributario) e dei
 * relativi sottotipi, in base alle tabelle fornite dallo studio.
 * Ogni sottotipo espone:
 *   - fields: i dati da chiedere all'utente per calcolare le scadenze
 *   - compute(values): restituisce l'elenco delle scadenze calcolate
 *
 * Le scadenze restituite hanno la forma:
 *   { label, date (Date), art, note, category }
 * dove category ∈ introduzione | cautelare | merito | impugnazione
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";
  const DU = global.DateUtils;

  function item(label, date, art, note, category) {
    if (!date) return null;
    return { label, date, art: art || "", note: note || "", category: category || "merito" };
  }

  function fwd(start, days, opts) {
    return DU.deadlineForward(start, days, opts);
  }
  function bwd(end, days, opts) {
    return DU.deadlineBackward(end, days, opts);
  }

  // -----------------------------------------------------------------
  // Blocco riutilizzabile: impugnazioni (appello / cassazione)
  // -----------------------------------------------------------------
  function impugnazioneFields() {
    return [
      {
        key: "tipoGrado",
        label: "Grado di impugnazione",
        type: "select",
        required: true,
        options: [
          { value: "appello", label: "Appello (2° grado)" },
          { value: "cassazione", label: "Cassazione (3° grado)" },
        ],
      },
      { key: "notificaSentenza", label: "Data di notifica della sentenza (se notificata)", type: "date", required: false },
      { key: "pubblicazioneSentenza", label: "Data di pubblicazione/deposito della sentenza", type: "date", required: true },
    ];
  }

  function impugnazioneItems(ambito, values) {
    const items = [];
    const isAppello = values.tipoGrado === "appello";
    const giorniBreve = ambito === "civile" ? 30 : ambito === "amministrativo" ? (isAppello ? 30 : 60) : 60;
    const artBreve = {
      civile: "Artt. 325-327 c.p.c.",
      amministrativo: isAppello ? "Art. 92 c.p.a." : "Art. 92 c.p.a. (giurisdizione)",
      tributario: isAppello ? "Art. 51 D.Lgs. 546/1992" : "Art. 62 D.Lgs. 546/1992",
    }[ambito];
    const labelGrado = isAppello ? "Appello" : "Cassazione";

    if (values.notificaSentenza) {
      items.push(
        item(
          `${labelGrado} — termine breve`,
          fwd(values.notificaSentenza, giorniBreve, { liberi: false, sospensione: true }),
          artBreve,
          `${giorniBreve} giorni dalla notifica della sentenza.`,
          "impugnazione"
        )
      );
    }
    if (values.pubblicazioneSentenza) {
      const start = values.pubblicazioneSentenza;
      let lungo = DU.addMonths(start, 6);
      lungo = DU.applySospensioneFeriale(start, lungo, "forward");
      lungo = DU.nextWorkingDay(lungo);
      items.push(
        item(
          `${labelGrado} — termine lungo`,
          lungo,
          `${artBreve} (termine lungo)`,
          "6 mesi dalla pubblicazione, se la sentenza non è stata notificata.",
          "impugnazione"
        )
      );
    }
    return items;
  }

  // -----------------------------------------------------------------
  // CIVILE
  // -----------------------------------------------------------------
  const civileOrdinario = {
    label: "Rito Ordinario (Atto di citazione)",
    fields: [
      { key: "notifica", label: "Data di notifica della citazione", type: "date", required: true },
      {
        key: "udienza",
        label: "Data di udienza di prima comparizione",
        type: "date",
        required: true,
        help: "Deve rispettare il termine minimo a comparire (120 giorni liberi, 150 se il convenuto è all'estero).",
      },
    ],
    compute(v) {
      const items = [];
      items.push(item("Costituzione dell'attore", fwd(v.notifica, 10, { sospensione: true }), "Art. 165 c.p.c.", "Entro 10 giorni dalla notifica della citazione.", "introduzione"));
      items.push(item("Costituzione del convenuto", bwd(v.udienza, 70, { sospensione: true }), "Art. 166 c.p.c.", "Almeno 70 giorni prima dell'udienza, a pena di decadenza per le domande riconvenzionali.", "introduzione"));
      items.push(item("Prima memoria — precisazione domande ed eccezioni", bwd(v.udienza, 40, { liberi: true, sospensione: true }), "Art. 171-ter, n.1 c.p.c.", "40 giorni liberi prima dell'udienza.", "merito"));
      items.push(item("Seconda memoria — repliche e richieste istruttorie", bwd(v.udienza, 20, { liberi: true, sospensione: true }), "Art. 171-ter, n.2 c.p.c.", "20 giorni liberi prima dell'udienza.", "merito"));
      items.push(item("Terza memoria — sola prova contraria", bwd(v.udienza, 10, { liberi: true, sospensione: true }), "Art. 171-ter, n.3 c.p.c.", "10 giorni liberi prima dell'udienza.", "merito"));
      return items.filter(Boolean);
    },
  };

  const civileSemplificato = {
    label: "Rito Semplificato / Appalti (Ricorso)",
    fields: [
      { key: "notifica", label: "Data di notifica del ricorso", type: "date", required: true },
      { key: "udienza", label: "Data di udienza fissata dal giudice con decreto", type: "date", required: false },
      {
        key: "terminePrimaMemoria",
        label: "Termine per la prima memoria concesso in udienza (giorni, max 20)",
        type: "number",
        required: false,
        help: "Nel rito semplificato le memorie decorrono in avanti dall'udienza e sono fissate dal giudice: compilare solo dopo l'udienza.",
      },
      { key: "terminePrimaMemoriaData", label: "Data da cui decorre la prima memoria (di norma la data dell'udienza)", type: "date", required: false },
      { key: "termineSecondaMemoria", label: "Termine per la seconda memoria concesso in udienza (giorni, max 10)", type: "number", required: false },
    ],
    compute(v) {
      const items = [];
      items.push(item("Costituzione dell'attore/ricorrente", DU.toDate(v.notifica), "—", "Contestuale al deposito del ricorso introduttivo.", "introduzione"));
      if (v.udienza) {
        items.push(item("Costituzione del convenuto", bwd(v.udienza, 10, { sospensione: true }), "Art. 702-bis c.p.c.", "Almeno 10 giorni prima dell'udienza.", "introduzione"));
      }
      if (v.terminePrimaMemoriaData && v.terminePrimaMemoria) {
        const d1 = fwd(v.terminePrimaMemoriaData, Number(v.terminePrimaMemoria), { sospensione: true });
        items.push(item("Prima memoria (termine concesso in udienza)", d1, "Art. 702-bis c.p.c.", `${v.terminePrimaMemoria} giorni dall'udienza (non superiore a 20), per precisare/modificare domande e chiedere prove dirette.`, "merito"));
        if (v.termineSecondaMemoria) {
          items.push(item("Seconda memoria (termine concesso in udienza)", fwd(d1, Number(v.termineSecondaMemoria), { sospensione: true }), "Art. 702-bis c.p.c.", `${v.termineSecondaMemoria} giorni dalla scadenza della prima memoria (non superiore a 10), per sole repliche e prova contraria.`, "merito"));
        }
      }
      return items.filter(Boolean);
    },
  };

  const civileFamiglia = {
    label: "Rito Famiglia — Rito Unificato (Art. 473-bis c.p.c.)",
    fields: [
      { key: "notifica", label: "Data di notifica del ricorso", type: "date", required: true },
      { key: "udienza", label: "Data di udienza fissata dal giudice con decreto", type: "date", required: true },
    ],
    compute(v) {
      const items = [];
      items.push(item("Costituzione del ricorrente", DU.toDate(v.notifica), "Art. 473-bis.12 c.p.c.", "Contestuale al deposito del ricorso.", "introduzione"));
      items.push(item("Costituzione del resistente/convenuto", bwd(v.udienza, 30, { sospensione: true }), "Art. 473-bis.16 c.p.c.", "Almeno 30 giorni prima dell'udienza, con allegazione dei redditi degli ultimi 3 anni.", "introduzione"));
      items.push(item("Memoria integrativa 1 (ricorrente)", bwd(v.udienza, 20, { sospensione: true }), "Art. 473-bis c.p.c.", "20 giorni prima dell'udienza, per repliche e prime istanze istruttorie.", "merito"));
      items.push(item("Memoria integrativa 2 (resistente)", bwd(v.udienza, 10, { sospensione: true }), "Art. 473-bis c.p.c.", "10 giorni prima dell'udienza, per ulteriori repliche e prove.", "merito"));
      items.push(item("Memoria integrativa 3 (ricorrente)", bwd(v.udienza, 5, { sospensione: true }), "Art. 473-bis c.p.c.", "5 giorni prima dell'udienza, per sola prova contraria.", "merito"));
      return items.filter(Boolean);
    },
  };

  const civileImpugnazione = {
    label: "Impugnazione (Appello / Cassazione)",
    fields: impugnazioneFields().concat([
      { key: "notificaAttoAppello", label: "Data di notifica dell'atto di appello (se appellante costituendosi)", type: "date", required: false },
      { key: "udienzaComparizioneAppello", label: "Data di udienza di comparizione in appello (se nota)", type: "date", required: false },
    ]),
    compute(v) {
      const items = impugnazioneItems("civile", v);
      if (v.notificaAttoAppello) {
        items.push(item("Costituzione dell'appellante", fwd(v.notificaAttoAppello, 10, { sospensione: true }), "Art. 165 c.p.c. (richiamato in appello)", "Entro 10 giorni dalla notifica dell'atto di appello.", "impugnazione"));
      }
      if (v.udienzaComparizioneAppello) {
        items.push(item("Costituzione dell'appellato", bwd(v.udienzaComparizioneAppello, 20, { sospensione: true }), "Art. 166 c.p.c. (richiamato in appello)", "Almeno 20 giorni prima dell'udienza di comparizione.", "impugnazione"));
      }
      return items.filter(Boolean);
    },
  };

  // -----------------------------------------------------------------
  // AMMINISTRATIVO (T.A.R.)
  // -----------------------------------------------------------------
  function tarMeritoFields(extra) {
    return [
      { key: "notifica", label: "Data di notifica del ricorso (o piena conoscenza dell'atto)", type: "date", required: true },
      { key: "udienza", label: "Data di udienza di merito (se già fissata)", type: "date", required: false },
      { key: "cautelare", label: "Richiesta anche la tutela cautelare (sospensiva)?", type: "checkbox", required: false },
    ].concat(extra || []);
  }

  function tarCautelareItems(v) {
    const items = [];
    if (!v.cautelare || !v.notifica) return items;
    // Camera di consiglio: prima data utile trascorsi 20gg dalla notifica
    // e 10gg dal deposito del ricorso (qui approssimato al deposito
    // calcolato altrove: usiamo 20gg dalla notifica come riferimento
    // prudenziale indicativo).
    const cameraIndicativa = fwd(v.notifica, 20, { sospensione: false, spostaFestivo: true });
    items.push(item("Camera di Consiglio cautelare (data indicativa)", cameraIndicativa, "Art. 55, co. 5 c.p.a.", "Fissata d'ufficio alla prima data utile trascorsi 20 giorni dalla notifica e 10 dal deposito del ricorso. Verificare il decreto di fissazione.", "cautelare"));
    items.push(item("Memorie difensive per la fase cautelare", bwd(cameraIndicativa, 2, { liberi: true, sospensione: false }), "Art. 55, co. 8 c.p.a.", "Fino a 2 giorni liberi prima della Camera di Consiglio. La sospensione feriale non si applica alle tutele cautelari urgenti.", "cautelare"));
    return items;
  }

  const tarOrdinario = {
    label: "Rito Ordinario T.A.R. (Art. 73 c.p.a.)",
    fields: tarMeritoFields(),
    compute(v) {
      const items = [];
      items.push(item("Deposito del ricorso", fwd(v.notifica, 30, { sospensione: true }), "Art. 45, co. 1 c.p.a.", "Entro 30 giorni dall'ultima notifica.", "introduzione"));
      items.push(item("Costituzione delle parti", fwd(v.notifica, 60, { sospensione: true }), "Art. 46, co. 1 c.p.a.", "Entro 60 giorni dalla notifica del ricorso.", "introduzione"));
      if (v.udienza) {
        items.push(item("1ª scadenza di merito — documenti", bwd(v.udienza, 40, { liberi: true, sospensione: true }), "Art. 73, co. 1 c.p.a.", "40 giorni liberi prima dell'udienza.", "merito"));
        items.push(item("2ª scadenza di merito — memorie", bwd(v.udienza, 30, { liberi: true, sospensione: true }), "Art. 73, co. 1 c.p.a.", "30 giorni liberi prima dell'udienza.", "merito"));
        items.push(item("3ª scadenza di merito — repliche", bwd(v.udienza, 20, { liberi: true, sospensione: true }), "Art. 73, co. 1 c.p.a.", "20 giorni liberi prima dell'udienza.", "merito"));
      }
      return items.concat(tarCautelareItems(v)).filter(Boolean);
    },
  };

  const tarAbbreviato = {
    label: "Rito Abbreviato / Appalti (Art. 119-120 c.p.a.)",
    fields: tarMeritoFields(),
    compute(v) {
      const items = [];
      items.push(item("Deposito del ricorso (dimezzato)", fwd(v.notifica, 15, { sospensione: true }), "Art. 119, co. 2 c.p.a.", "Entro 15 giorni dall'ultima notifica (termine ordinario non dimezzato per la notifica).", "introduzione"));
      items.push(item("Costituzione delle parti (dimezzata)", fwd(v.notifica, 30, { sospensione: true }), "Art. 119, co. 2 c.p.a.", "Entro 30 giorni dalla notifica del ricorso.", "introduzione"));
      if (v.udienza) {
        items.push(item("1ª scadenza di merito — documenti", bwd(v.udienza, 20, { liberi: true, sospensione: true }), "Art. 119, co. 2 c.p.a.", "20 giorni liberi prima dell'udienza.", "merito"));
        items.push(item("2ª scadenza di merito — memorie", bwd(v.udienza, 15, { liberi: true, sospensione: true }), "Art. 119, co. 2 c.p.a.", "15 giorni liberi prima dell'udienza.", "merito"));
        items.push(item("3ª scadenza di merito — repliche", bwd(v.udienza, 10, { liberi: true, sospensione: true }), "Art. 119, co. 2 c.p.a.", "10 giorni liberi prima dell'udienza.", "merito"));
      }
      return items.concat(tarCautelareItems(v)).filter(Boolean);
    },
  };

  function tarCamerale(tipo) {
    const isSilenzio = tipo === "silenzio";
    return {
      label: isSilenzio ? "Rito Camerale — Silenzio (Art. 117 c.p.a.)" : "Rito Camerale — Accesso (Art. 116 c.p.a.)",
      fields: [
        {
          key: "decorrenza",
          label: isSilenzio ? "Data di formazione del silenzio / scadenza del termine per provvedere" : "Data di conoscenza del diniego (espresso o tacito) di accesso",
          type: "date",
          required: true,
        },
        { key: "notifica", label: "Data di notifica del ricorso (una volta proposto)", type: "date", required: false },
        { key: "udienza", label: "Data di udienza camerale (se già fissata)", type: "date", required: false },
      ],
      compute(v) {
        const items = [];
        if (isSilenzio) {
          items.push(item("Termine ultimo per la notifica del ricorso", fwd(v.decorrenza, 365, { sospensione: false, spostaFestivo: true }), "Art. 117, co. 1 c.p.a.", "1 anno dalla scadenza del termine per provvedere (fatta salva la riproposizione dell'istanza).", "introduzione"));
        } else {
          items.push(item("Termine ultimo per la notifica del ricorso", fwd(v.decorrenza, 30, { sospensione: true }), "Art. 116, co. 1 c.p.a.", "30 giorni dalla conoscenza del diniego.", "introduzione"));
        }
        if (v.notifica) {
          items.push(item("Deposito del ricorso (dimezzato)", fwd(v.notifica, 15, { sospensione: true }), "Art. 87, co. 3 c.p.a.", "Entro 15 giorni dall'ultima notifica.", "introduzione"));
          items.push(item("Costituzione delle parti (dimezzata)", fwd(v.notifica, 30, { sospensione: true }), "Art. 87, co. 3 c.p.a.", "Entro 30 giorni dalla notifica del ricorso.", "introduzione"));
        }
        if (v.udienza) {
          items.push(item("1ª scadenza — documenti", bwd(v.udienza, 15, { liberi: true, sospensione: true }), "Art. 87, co. 3 c.p.a.", "15 giorni liberi prima dell'udienza.", "merito"));
          items.push(item("2ª scadenza — memorie", bwd(v.udienza, 10, { liberi: true, sospensione: true }), "Art. 87, co. 3 c.p.a.", "10 giorni liberi prima dell'udienza.", "merito"));
          items.push(item("3ª scadenza — repliche", bwd(v.udienza, 5, { liberi: true, sospensione: true }), "Art. 87, co. 3 c.p.a.", "5 giorni liberi prima dell'udienza.", "merito"));
        }
        return items.filter(Boolean);
      },
    };
  }

  const amministrativoImpugnazione = {
    label: "Impugnazione (Appello Consiglio di Stato / Cassazione)",
    fields: impugnazioneFields(),
    compute(v) {
      return impugnazioneItems("amministrativo", v).filter(Boolean);
    },
  };

  // -----------------------------------------------------------------
  // TRIBUTARIO (Corte di Giustizia Tributaria)
  // -----------------------------------------------------------------
  const tributarioPrimoGrado = {
    label: "Primo Grado — Corte di Giustizia Tributaria",
    fields: [
      { key: "notificaAtto", label: "Data di notifica dell'atto impositivo/cartella impugnato", type: "date", required: true },
      { key: "notificaRicorso", label: "Data di notifica del ricorso all'Ente impositore (se già proposto)", type: "date", required: false },
      { key: "udienza", label: "Data di trattazione/udienza (se già fissata)", type: "date", required: false },
      { key: "cautelare", label: "Proposta anche istanza di sospensione dell'atto?", type: "checkbox", required: false },
    ],
    compute(v) {
      const items = [];
      items.push(item("Termine per la notifica del ricorso introduttivo", fwd(v.notificaAtto, 60, { sospensione: true }), "Art. 21, co. 1 D.Lgs. 546/1992", "60 giorni dalla notifica dell'atto impositivo o della cartella.", "introduzione"));
      if (v.notificaRicorso) {
        items.push(item("Costituzione del ricorrente (deposito)", fwd(v.notificaRicorso, 30, { sospensione: true }), "Art. 22, co. 1 D.Lgs. 546/1992", "Entro 30 giorni dalla notifica del ricorso, a pena di inammissibilità.", "introduzione"));
        items.push(item("Costituzione della parte resistente", fwd(v.notificaRicorso, 60, { sospensione: true }), "Art. 23, co. 1 D.Lgs. 546/1992", "Entro 60 giorni dalla notifica del ricorso (termine ordinatorio).", "introduzione"));
        if (v.cautelare) {
          items.push(item("Trattazione dell'istanza cautelare (prima Camera di Consiglio utile)", fwd(v.notificaRicorso, 30, { sospensione: false }), "Art. 47, co. 2 D.Lgs. 546/1992", "Fissata alla prima camera di consiglio utile; avviso alle parti almeno 10 giorni liberi prima. Data indicativa: verificare l'avviso di trattazione.", "cautelare"));
        }
      }
      if (v.udienza) {
        items.push(item("Avviso di trattazione", bwd(v.udienza, 30, { liberi: true, sospensione: true }), "Art. 31, co. 2 D.Lgs. 546/1992", "Comunicato dalla segreteria alle parti almeno 30 giorni liberi prima.", "merito"));
        items.push(item("1ª scadenza di merito — documenti", bwd(v.udienza, 20, { liberi: true, sospensione: true }), "Art. 32, co. 1 D.Lgs. 546/1992", "Fino a 20 giorni liberi prima dell'udienza/trattazione.", "merito"));
        items.push(item("2ª scadenza di merito — memorie", bwd(v.udienza, 10, { liberi: true, sospensione: true }), "Art. 32, co. 2 D.Lgs. 546/1992", "Fino a 10 giorni liberi prima dell'udienza/trattazione.", "merito"));
        items.push(item("3ª scadenza di merito — repliche (solo Camera di Consiglio)", bwd(v.udienza, 5, { liberi: true, sospensione: true }), "Art. 32, co. 3 D.Lgs. 546/1992", "Fino a 5 giorni liberi prima; ammissibili solo in caso di trattazione in Camera di Consiglio.", "merito"));
      }
      return items.filter(Boolean);
    },
  };

  const tributarioIntegrazioneMotivi = {
    label: "Integrazione dei motivi (documenti sopravvenuti)",
    fields: [{ key: "conoscenza", label: "Data di conoscenza del deposito di documenti non conosciuti", type: "date", required: true }],
    compute(v) {
      return [item("Integrazione dei motivi", fwd(v.conoscenza, 60, { sospensione: true }), "Art. 24, co. 2 D.Lgs. 546/1992", "60 giorni dalla conoscenza del deposito documentale, a pena di decadenza.", "introduzione")].filter(Boolean);
    },
  };

  const tributarioImpugnazione = {
    label: "Impugnazione (Appello CGT II grado / Cassazione Sez. Tributaria)",
    fields: impugnazioneFields(),
    compute(v) {
      return impugnazioneItems("tributario", v).filter(Boolean);
    },
  };

  // -----------------------------------------------------------------
  global.RITI = {
    civile: {
      label: "Civile",
      sottotipi: {
        ordinario: civileOrdinario,
        semplificato: civileSemplificato,
        famiglia: civileFamiglia,
        impugnazione: civileImpugnazione,
      },
    },
    amministrativo: {
      label: "Amministrativo",
      sottotipi: {
        ordinario: tarOrdinario,
        abbreviato: tarAbbreviato,
        accesso: tarCamerale("accesso"),
        silenzio: tarCamerale("silenzio"),
        impugnazione: amministrativoImpugnazione,
      },
    },
    tributario: {
      label: "Tributario",
      sottotipi: {
        primogrado: tributarioPrimoGrado,
        integrazione: tributarioIntegrazioneMotivi,
        impugnazione: tributarioImpugnazione,
      },
    },
  };
})(window);
