/**
 * date-utils.js
 * ------------------------------------------------------------------
 * Funzioni di calcolo delle date processuali: giorni liberi, termini
 * "a ritroso" e "in avanti", sospensione feriale (1-31 agosto) e
 * proroga/anticipo per giorno festivo.
 *
 * NOTA IMPORTANTE: si tratta di un calcolo automatico di supporto.
 * Le date prodotte vanno sempre verificate dal professionista, in
 * particolare per prassi locali, festività infrasettimanali del
 * foro/circondario e casi limite (rinvii d'udienza, notifiche multiple
 * a destinatari diversi, ecc.).
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  function toDate(value) {
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    // atteso formato "YYYY-MM-DD" (input type=date)
    const [y, m, d] = String(value).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(date, n) {
    const d = toDate(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function addMonths(date, n) {
    const d = toDate(date);
    const targetMonth = d.getMonth() + n;
    const result = new Date(d.getFullYear(), targetMonth, d.getDate());
    // se il mese di destinazione non ha il giorno (es. 31), Date normalizza
    // scivolando al mese successivo: correggiamo riportando all'ultimo
    // giorno del mese di destinazione.
    if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
      result.setDate(0);
    }
    return result;
  }

  function toISO(date) {
    const d = toDate(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const WEEKDAY_LABELS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const MONTH_LABELS = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
  ];

  function formatIt(date) {
    const d = toDate(date);
    return `${WEEKDAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatItShort(date) {
    const d = toDate(date);
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${m}/${d.getFullYear()}`;
  }

  // Domenica di Pasqua (algoritmo di Gauss/Meeus, calendario gregoriano)
  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function nationalHolidaysForYear(year) {
    const easter = easterSunday(year);
    const easterMonday = addDays(easter, 1);
    return [
      new Date(year, 0, 1), // Capodanno
      new Date(year, 0, 6), // Epifania
      easterMonday, // Pasquetta
      new Date(year, 3, 25), // Liberazione
      new Date(year, 4, 1), // Festa del Lavoro
      new Date(year, 5, 2), // Festa della Repubblica
      new Date(year, 7, 15), // Ferragosto
      new Date(year, 10, 1), // Ognissanti
      new Date(year, 11, 8), // Immacolata
      new Date(year, 11, 25), // Natale
      new Date(year, 11, 26), // Santo Stefano
    ];
  }

  const holidayCache = new Map();
  function isNationalHoliday(date) {
    const d = toDate(date);
    const year = d.getFullYear();
    if (!holidayCache.has(year)) {
      holidayCache.set(year, new Set(nationalHolidaysForYear(year).map(toISO)));
    }
    return holidayCache.get(year).has(toISO(d));
  }

  function isWeekend(date) {
    const day = toDate(date).getDay();
    return day === 0 || day === 6;
  }

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  function isNonWorkingDay(date) {
    const d = toDate(date);
    // Una data non valida (es. da un campo mancante o corrotto) non va
    // considerata "festiva": altrimenti nextWorkingDay/previousWorkingDay
    // non troverebbero mai un giorno lavorativo e resterebbero in loop.
    if (!isValidDate(d)) return false;
    return isWeekend(d) || isNationalHoliday(d);
  }

  function nextWorkingDay(date) {
    let d = toDate(date);
    if (!isValidDate(d)) return d;
    let guard = 0;
    while (isNonWorkingDay(d) && guard < 366) {
      d = addDays(d, 1);
      guard++;
    }
    return d;
  }

  function previousWorkingDay(date) {
    let d = toDate(date);
    if (!isValidDate(d)) return d;
    let guard = 0;
    while (isNonWorkingDay(d) && guard < 366) {
      d = addDays(d, -1);
      guard++;
    }
    return d;
  }

  /**
   * Applica la sospensione feriale (art. 1 L. 742/1969, dal 1° al 31
   * agosto) sommando 31 giorni per ogni agosto compreso nell'intervallo
   * [start, end]. Approssimazione prasseologica standard (si sospende
   * l'intero mese, non il solo periodo di sovrapposizione).
   */
  /**
   * @param {string|Date} anchor - la data fissa da cui il termine decorre
   *   (dies a quo per un termine "in avanti", data dell'udienza per un
   *   termine "a ritroso")
   * @param {string|Date} computed - la scadenza grezza, già calcolata,
   *   da correggere
   * @param {"forward"|"backward"} direction
   */
  function applySospensioneFeriale(anchor, computed, direction) {
    let result = toDate(computed);
    const a = toDate(anchor);
    const startYear = Math.min(a.getFullYear(), result.getFullYear());
    const endYear = Math.max(a.getFullYear(), result.getFullYear());
    for (let y = startYear; y <= endYear; y++) {
      const aug1 = new Date(y, 7, 1);
      const aug31 = new Date(y, 7, 31);
      const lo = a < result ? a : result;
      const hi = a < result ? result : a;
      if (lo <= aug31 && hi >= aug1) {
        result = addDays(result, direction === "forward" ? 31 : -31);
      }
    }
    return result;
  }

  /**
   * Termine che decorre IN AVANTI da una data nota (es. notifica) verso
   * il futuro (es. "entro 30 giorni dalla notifica").
   *
   * @param {string|Date} start - dies a quo (escluso dal computo)
   * @param {number} days - numero di giorni del termine
   * @param {object} opts
   * @param {boolean} [opts.liberi=false] - giorni liberi (tra dies a quo
   *   e dies ad quem, entrambi esclusi) invece di giorni "a decorrenza"
   *   (dies a quo escluso, dies ad quem incluso — art. 155 c.p.c.)
   * @param {boolean} [opts.sospensione=true] - applica sospensione feriale
   * @param {boolean} [opts.spostaFestivo=true] - se la scadenza cade in
   *   giorno festivo, la proroga al primo giorno feriale successivo
   */
  function deadlineForward(start, days, opts = {}) {
    const { liberi = false, sospensione = true, spostaFestivo = true } = opts;
    const s = toDate(start);
    let d = liberi ? addDays(s, days + 1) : addDays(s, days);
    if (sospensione) d = applySospensioneFeriale(s, d, "forward");
    if (spostaFestivo) d = nextWorkingDay(d);
    return d;
  }

  /**
   * Termine che decorre A RITROSO da una data nota (es. udienza) verso
   * il passato (es. "40 giorni liberi prima dell'udienza").
   *
   * Per prassi costante (v. nota tabellare TAR), se la scadenza calcolata
   * cade in giorno festivo si ANTICIPA al giorno feriale precedente (non
   * si proroga, per non erodere il termine a difesa della controparte).
   */
  function deadlineBackward(end, days, opts = {}) {
    const { liberi = false, sospensione = true, spostaFestivo = true } = opts;
    const e = toDate(end);
    let d = liberi ? addDays(e, -(days + 1)) : addDays(e, -days);
    if (sospensione) d = applySospensioneFeriale(e, d, "backward");
    if (spostaFestivo) d = previousWorkingDay(d);
    return d;
  }

  global.DateUtils = {
    toDate,
    addDays,
    addMonths,
    toISO,
    formatIt,
    formatItShort,
    isNationalHoliday,
    isWeekend,
    isNonWorkingDay,
    isValidDate,
    nextWorkingDay,
    previousWorkingDay,
    applySospensioneFeriale,
    deadlineForward,
    deadlineBackward,
  };
})(window);
