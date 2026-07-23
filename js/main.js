(function () {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById("site-header");
  var onScroll = function () {
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");
  navToggle.addEventListener("click", function () {
    var isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mainNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Booking modal ---------- */
  var config = window.BOOKING_CONFIG || {};
  var overlay = document.getElementById("booking-modal");
  var modalBody = document.getElementById("modal-body");
  var modalClose = document.getElementById("modal-close");

  var content = {
    online: {
      title: "Consulenza Online",
      price: config.onlineConsultationPrice ? "€ " + config.onlineConsultationPrice : "",
      features: [
        "Consulenza da remoto, in videochiamata",
        "45 minuti per un primo orientamento su un quesito specifico",
        "Pagamento sicuro con carta di credito",
      ],
      note: "Questa consulenza è pensata per fornire chiarimenti e un primo orientamento legale. Non comprende la presa in carico della pratica: un'eventuale prosecuzione viene valutata solo in un secondo momento, se lo riterrai utile.",
      url: config.onlineConsultationUrl,
      cta: "Scegli data e ora",
    },
    presence: {
      title: "Consulenza in Presenza",
      price: "",
      features: [
        "Incontro diretto, su appuntamento",
        "Analisi della fattispecie e impostazione della strategia legale",
        "Calendario con le disponibilità reali",
      ],
      note: "Un momento dedicato all'analisi della fattispecie e alla definizione della strategia più adatta, anche alla luce di eventuale documentazione: il passaggio più indicato se stai valutando di affidarmi la pratica.",
      url: config.inPersonConsultationUrl,
      cta: "Scegli data e ora",
    },
  };

  /* ---------- Simulated availability (preview only, until real booking is connected) ---------- */
  var GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  var ALL_TIMES = ["09:30", "11:00", "12:30", "15:00", "16:30", "17:30"];

  function formatDay(d) {
    var s = GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function mockDays(n) {
    var days = [];
    var d = new Date();
    while (days.length < n) {
      d = new Date(d.getTime() + 86400000);
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) days.push(new Date(d));
    }
    return days;
  }

  function timesForDay(index) {
    return ALL_TIMES.filter(function (t, i) { return (i + index) % 4 !== 0; });
  }

  /* ---------- Modal state machine ---------- */
  var state = { type: null, step: "info", slotLabel: null };

  function renderInfoStep(data) {
    var isConfigured = data.url && data.url !== "#";
    var html = "";
    html += '<p class="eyebrow">' + data.title + "</p>";
    html += '<h2 id="modal-title">Prenota</h2>';
    if (data.price) html += '<p class="modal-price">' + data.price + "</p>";
    html += '<ul class="modal-features">';
    data.features.forEach(function (f) { html += "<li>" + f + "</li>"; });
    html += "</ul>";
    if (data.note) html += '<p class="modal-scope">' + data.note + "</p>";

    if (isConfigured) {
      html +=
        '<a class="btn btn-primary" style="width:100%" href="' + data.url +
        '" target="_blank" rel="noopener">' + data.cta + "</a>";
    } else {
      html +=
        '<button type="button" class="btn btn-primary" style="width:100%" data-action="start-sim">' +
        data.cta + "</button>";
      html +=
        '<p class="modal-note">La prenotazione online sarà attiva a breve: quella che segue è un\'anteprima di come funzionerà. Per un appuntamento reale, nel frattempo, scrivimi o chiamami al +39 366 340 1088.</p>';
    }
    return html;
  }

  function renderSlotsStep(data) {
    var html = "";
    html += '<p class="eyebrow">' + data.title + " · Anteprima</p>";
    html += "<h2>Scegli data e ora</h2>";
    html += '<div class="slot-grid">';
    mockDays(5).forEach(function (d, i) {
      html += '<div class="slot-day"><h4>' + formatDay(d) + "</h4>";
      html += '<div class="slot-times">';
      timesForDay(i).forEach(function (t) {
        var label = formatDay(d) + ", ore " + t;
        html +=
          '<button type="button" class="slot-btn" data-action="pick-slot" data-label="' +
          label + '">' + t + "</button>";
      });
      html += "</div></div>";
    });
    html += "</div>";
    html += '<div class="modal-actions"><button type="button" class="btn btn-ghost" style="width:100%" data-action="back">Indietro</button></div>';
    return html;
  }

  function renderPaymentStep(data) {
    var html = "";
    html += '<p class="eyebrow">' + data.title + " · Anteprima</p>";
    html += "<h2>Pagamento</h2>";
    html += '<p class="modal-summary"><strong>' + state.slotLabel + "</strong>Videochiamata da remoto</p>";
    if (data.price) html += '<p class="modal-price">' + data.price + "</p>";
    html += '<div class="pay-form">';
    html += '<label>Titolare della carta<input type="text" placeholder="Nome e Cognome" /></label>';
    html += '<label>Numero carta<input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" /></label>';
    html += '<div class="pay-row"><label>Scadenza<input type="text" placeholder="MM/AA" maxlength="5" /></label><label>CVC<input type="text" inputmode="numeric" placeholder="123" maxlength="3" /></label></div>';
    html += "</div>";
    html += '<p class="modal-scope">Anteprima del pagamento: nessun addebito reale viene effettuato qui. Una volta attivata la prenotazione online, il pagamento sarà elaborato in modo sicuro con carta di credito.</p>';
    html += '<button type="button" class="btn btn-primary" style="width:100%" data-action="pay">Paga e conferma' + (data.price ? " — " + data.price : "") + "</button>";
    html += '<div class="modal-actions"><button type="button" class="btn btn-ghost" style="width:100%" data-action="back">Indietro</button></div>';
    return html;
  }

  function renderConfirmStep(data) {
    var html = "";
    html += '<div class="confirm-check" aria-hidden="true">&#10003;</div>';
    html += '<p class="eyebrow">Anteprima</p>';
    html += "<h2>Prenotazione simulata</h2>";
    html += '<p class="modal-summary"><strong>' + data.title + "</strong>" + state.slotLabel + "</p>";
    html += '<p class="modal-scope">' + data.note + "</p>";
    html +=
      '<p class="modal-note">Questa è una simulazione: non è stata creata nessuna prenotazione reale e non è stato effettuato alcun pagamento. Per fissare davvero un appuntamento, scrivimi o chiamami al +39 366 340 1088.</p>';
    html += '<button type="button" class="btn btn-primary" style="width:100%" data-action="close">Chiudi</button>';
    return html;
  }

  function render() {
    var data = content[state.type];
    if (!data) return;
    var html;
    if (state.step === "slots") html = renderSlotsStep(data);
    else if (state.step === "payment") html = renderPaymentStep(data);
    else if (state.step === "confirm") html = renderConfirmStep(data);
    else html = renderInfoStep(data);
    modalBody.innerHTML = html;
  }

  function openModal(type) {
    if (!content[type]) return;
    state = { type: type, step: "info", slotLabel: null };
    render();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modalBody.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");

    if (action === "start-sim") {
      state.step = "slots";
      render();
    } else if (action === "pick-slot") {
      state.slotLabel = el.getAttribute("data-label");
      state.step = state.type === "online" ? "payment" : "confirm";
      render();
    } else if (action === "pay") {
      state.step = "confirm";
      render();
    } else if (action === "back") {
      state.step = state.step === "payment" ? "slots" : "info";
      render();
    } else if (action === "close") {
      closeModal();
    }
  });

  document.querySelectorAll("[data-open-booking]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.getAttribute("data-open-booking"));
    });
  });

  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
  });
})();
