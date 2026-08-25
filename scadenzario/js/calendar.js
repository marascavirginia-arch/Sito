/**
 * calendar.js
 * ------------------------------------------------------------------
 * Due modalità di collegamento a Google Calendar:
 *
 * 1) Esportazione .ics (sempre disponibile, nessuna configurazione):
 *    genera un file da importare in blocco in Google Calendar
 *    (Impostazioni > Importa e esporta > Importa).
 *
 * 2) Sincronizzazione diretta via Google Calendar API (richiede un
 *    Client ID OAuth configurato in js/calendar-config.js): con un
 *    click crea gli eventi direttamente nel calendario Google
 *    dell'utente collegato, senza scaricare/importare nulla.
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";
  const DU = global.DateUtils;

  // Promemoria: invece di un avviso pop-up, per ogni scadenza si crea
  // un evento visibile a sé nel calendario, questi giorni prima.
  const REMINDER_DAYS_BEFORE = [10, 5, 3];

  /**
   * Titolo unico per l'evento vero e per tutti i suoi promemoria: dice
   * sempre la data effettiva di scadenza, non la data del promemoria.
   */
  function formatEventTitle(cliente, label, dueDate) {
    return `Il ${DU.formatItShort(dueDate)} scade "${label}" — pratica ${cliente}`;
  }

  /**
   * Espande ogni scadenza in più eventi: quello vero, sulla data
   * effettiva, più un evento promemoria per ciascun valore di
   * REMINDER_DAYS_BEFORE, collocato quei giorni prima. Tutti condividono
   * lo stesso titolo (con la data vera di scadenza).
   * @param {Array} events - [{ uid, cliente, label, date, description }]
   */
  function withReminderEntries(events) {
    const expanded = [];
    events.forEach((ev) => {
      const title = formatEventTitle(ev.cliente, ev.label, ev.date);
      expanded.push({ ...ev, title });
      REMINDER_DAYS_BEFORE.forEach((days) => {
        expanded.push({
          uid: `${ev.uid}_rem${days}`,
          title,
          date: DU.addDays(ev.date, -days),
          description: `Promemoria: mancano ${days} giorni.${ev.description ? " " + ev.description : ""}`,
        });
      });
    });
    return expanded;
  }

  // -----------------------------------------------------------------
  // 1) Esportazione .ics
  // -----------------------------------------------------------------
  function icsDate(date) {
    const d = DU.toDate(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function escapeICS(text) {
    return String(text || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  function foldLine(line) {
    // RFC 5545: le righe > 75 ottetti vanno spezzate con CRLF + spazio
    if (line.length <= 75) return line;
    let out = "";
    let rest = line;
    while (rest.length > 75) {
      out += rest.slice(0, 75) + "\r\n ";
      rest = rest.slice(75);
    }
    return out + rest;
  }

  /**
   * @param {Array} events - [{ uid, title, date, description }]
   */
  function buildICS(events) {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Scadenzario Studio Legale//IT", "CALSCALE:GREGORIAN"];
    const now = icsDate(new Date());
    withReminderEntries(events).forEach((ev) => {
      const day = icsDate(ev.date);
      lines.push("BEGIN:VEVENT");
      lines.push(foldLine(`UID:${ev.uid}@scadenzario`));
      lines.push(`DTSTAMP:${now}T000000Z`);
      lines.push(`DTSTART;VALUE=DATE:${day}`);
      lines.push(`DTEND;VALUE=DATE:${day}`);
      lines.push(foldLine(`SUMMARY:${escapeICS(ev.title)}`));
      if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeICS(ev.description)}`));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function downloadICS(events, filename) {
    const ics = buildICS(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "scadenze.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // -----------------------------------------------------------------
  // 2) Sincronizzazione diretta via Google Calendar API (login condiviso
  //    con la sincronizzazione su Drive — vedi google-auth.js)
  // -----------------------------------------------------------------
  function isConfigured() {
    return global.GoogleAuth ? global.GoogleAuth.isConfigured() : false;
  }

  async function pushEventsToGoogleCalendar(events, onProgress) {
    const token = await global.GoogleAuth.ensureToken();
    const calendarId = encodeURIComponent((global.CALENDAR_CONFIG && global.CALENDAR_CONFIG.googleCalendarId) || "primary");
    const expanded = withReminderEntries(events);
    const results = [];
    for (let i = 0; i < expanded.length; i++) {
      const ev = expanded[i];
      const day = DU.toISO(ev.date);
      const nextDay = DU.toISO(DU.addDays(ev.date, 1));
      const body = {
        summary: ev.title,
        description: ev.description || "",
        start: { date: day },
        end: { date: nextDay },
        reminders: { useDefault: false, overrides: [] },
      };
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        results.push({ ok: true, event: ev });
      } catch (e) {
        results.push({ ok: false, event: ev, error: e.message });
      }
      if (onProgress) onProgress(i + 1, expanded.length);
    }
    return results;
  }

  global.CalendarSync = {
    buildICS,
    downloadICS,
    isConfigured,
    pushEventsToGoogleCalendar,
    formatEventTitle,
  };
})(window);
