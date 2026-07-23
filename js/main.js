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
        "Calendario con le disponibilità reali",
        "Data, ora e dettagli confermati via email",
      ],
      note: "Un momento utile per esaminare con calma la tua situazione, anche con eventuale documentazione: il passaggio più indicato se stai valutando di affidarmi la pratica.",
      url: config.inPersonConsultationUrl,
      cta: "Scegli data e ora",
    },
  };

  function openModal(type) {
    var data = content[type];
    if (!data) return;

    var isConfigured = data.url && data.url !== "#";

    var html = "";
    html += '<p class="eyebrow">' + data.title + "</p>";
    html += "<h2 id=\"modal-title\">Prenota</h2>";
    if (data.price) html += '<p class="modal-price">' + data.price + "</p>";
    html += '<ul class="modal-features">';
    data.features.forEach(function (f) {
      html += "<li>" + f + "</li>";
    });
    html += "</ul>";
    if (data.note) html += '<p class="modal-scope">' + data.note + "</p>";

    if (isConfigured) {
      html +=
        '<a class="btn btn-primary" style="width:100%" href="' +
        data.url +
        '" target="_blank" rel="noopener">' +
        data.cta +
        "</a>";
    } else {
      html +=
        '<a class="btn btn-primary" style="width:100%" href="mailto:avvocatopetrucci.sp@gmail.com?subject=Richiesta%20' +
        encodeURIComponent(data.title) +
        '">Scrivimi per prenotare</a>';
      html +=
        '<p class="modal-note">La prenotazione online sarà attiva a breve. Nel frattempo scrivimi o chiamami al +39 366 340 1088 per fissare un appuntamento.</p>';
    }

    modalBody.innerHTML = html;
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
