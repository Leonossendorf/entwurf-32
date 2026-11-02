/* Hausarztpraxis Metelen, Entwurf. Kein Tracking, keine fremden Dienste. */
(function () {
  "use strict";
  var html = document.documentElement;
  html.classList.add("js");

  function pref(k) { try { return localStorage.getItem("hm-" + k); } catch (e) { return null; } }
  function setPref(k, v) { try { if (v === null) localStorage.removeItem("hm-" + k); else localStorage.setItem("hm-" + k, v); } catch (e) {} }
  function alle(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* Stand-Check: nach einer Änderung einmal frisch laden, GitHub Pages hält Seiten 10 Minuten */
  if (window.STAND && window.fetch && location.protocol !== "file:") {
    fetch("stand.txt?" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (t) {
      t = t.trim();
      if (t && t !== window.STAND) {
        var k = "hm-neu-" + t, schon = false;
        try { schon = sessionStorage.getItem(k); sessionStorage.setItem(k, "1"); } catch (e) { schon = true; }
        if (!schon) location.reload();
      }
    }).catch(function () {});
  }

  /* Kopf bekommt beim Scrollen eine Fläche */
  var kopf = document.querySelector(".kopf");
  if (document.querySelector(".auftakt")) {
    var fest = function () { kopf.classList.toggle("fest", window.scrollY > 40); };
    window.addEventListener("scroll", fest, { passive: true });
    fest();
  } else {
    document.body.classList.add("seite-unter");
  }

  /* Ansicht anpassen */
  var hilfe = document.getElementById("hilfe"), hilfeAuf = document.querySelector("[data-hilfe-auf]");
  if (hilfe && hilfeAuf) {
    hilfeAuf.addEventListener("click", function () {
      var auf = hilfe.hidden;
      hilfe.hidden = !auf;
      hilfeAuf.setAttribute("aria-expanded", auf ? "true" : "false");
    });
  }
  function setzeSchrift(n) {
    html.classList.remove("schrift-1", "schrift-2");
    if (n) html.classList.add("schrift-" + n);
    alle("[data-schrift]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-schrift") === String(n) ? "true" : "false"); });
  }
  alle("[data-schrift]").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = Number(b.getAttribute("data-schrift"));
      setzeSchrift(n); setPref("schrift", n ? String(n) : null);
    });
  });
  setzeSchrift(Number(pref("schrift") || 0));
  alle("[data-schalter]").forEach(function (b) {
    var name = b.getAttribute("data-schalter");
    if (pref(name) === "1") { html.classList.add(name); b.setAttribute("aria-pressed", "true"); }
    b.addEventListener("click", function () {
      var an = html.classList.toggle(name);
      b.setAttribute("aria-pressed", an ? "true" : "false");
      setPref(name, an ? "1" : null);
    });
  });
  var lesen = document.querySelector("[data-vorlesen]");
  if (lesen) {
    if (!("speechSynthesis" in window)) lesen.hidden = true;
    else lesen.addEventListener("click", function () {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); lesen.setAttribute("aria-pressed", "false"); return; }
      var u = new SpeechSynthesisUtterance(document.getElementById("inhalt").innerText);
      u.lang = "de-DE";
      u.onend = function () { lesen.setAttribute("aria-pressed", "false"); };
      lesen.setAttribute("aria-pressed", "true");
      speechSynthesis.speak(u);
    });
  }

  /* Menü auf dem Handy */
  var mk = document.querySelector(".menue-knopf"), menue = document.getElementById("hauptmenue");
  if (mk && menue) {
    mk.addEventListener("click", function () {
      var auf = menue.classList.toggle("offen");
      mk.setAttribute("aria-expanded", auf ? "true" : "false");
    });
    alle("a", menue).forEach(function (a) { a.addEventListener("click", function () { menue.classList.remove("offen"); mk.setAttribute("aria-expanded", "false"); }); });
  }

  /* Wahl der Praxis. Die Seite merkt sich die Wahl, beim nächsten Besuch ist die eigene Praxis offen. */
  var wahl = document.querySelector("[data-wahl]");
  function oeffne(ort, merken) {
    if (!wahl) return;
    var aktuell = wahl.getAttribute("data-offen");
    var ziel = aktuell === ort ? null : ort;
    alle(".tor[data-ort]", wahl).forEach(function (t) {
      var an = t.getAttribute("data-ort") === ziel, k = t.querySelector(".tor-knopf");
      t.classList.toggle("offen", an);
      t.querySelector(".tor-inhalt").hidden = !an;
      k.setAttribute("aria-expanded", an ? "true" : "false");
    });
    if (ziel) wahl.setAttribute("data-offen", ziel); else wahl.removeAttribute("data-offen");
    if (merken) setPref("ort", ziel);
  }
  alle(".tor-knopf").forEach(function (k) {
    k.addEventListener("click", function () { oeffne(k.closest(".tor").getAttribute("data-ort"), true); });
  });
  var gemerkt = pref("ort");
  if (gemerkt) oeffne(gemerkt, false);

  /* Status je Standort. Eine Quelle für beide: hier ändern, überall richtig. Stand November 2026. */
  var ZEITEN = {
    wettringen: { 1: [[450, 720], [840, 1020]], 2: [[450, 720], [840, 1020]], 3: [[450, 720]], 4: [[450, 720], [840, 1020]], 5: [[450, 720]] },
    schilden: { 1: [[450, 720], [900, 1080]], 2: [[450, 720], [900, 1080]], 3: [[450, 780]], 4: [[450, 720], [900, 1080]], 5: [[450, 780]] }
  };
  var ZU = { wettringen: [], schilden: ["2026-12-28"] };
  var FEIERTAGE = ["2026-11-01", "2026-12-25", "2026-12-26", "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-01", "2027-05-06", "2027-05-17", "2027-05-27", "2027-10-03", "2027-11-01", "2027-12-25", "2027-12-26"];
  var TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  function berlin() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" })); }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function uhr(min) { var h = Math.floor(min / 60), m = min % 60; return h + (m ? ":" + ("0" + m).slice(-2) : "") + " Uhr"; }
  function bloecke(ort, d) {
    var s = iso(d);
    if (FEIERTAGE.indexOf(s) >= 0 || ZU[ort].indexOf(s) >= 0) return [];
    return ZEITEN[ort][d.getDay()] || [];
  }
  function naechste(ort, jetzt) {
    var d = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()), m = jetzt.getHours() * 60 + jetzt.getMinutes();
    for (var i = 0; i < 21; i++) {
      var b = bloecke(ort, d);
      for (var k = 0; k < b.length; k++) if (i > 0 || b[k][0] > m) return { tag: i, datum: new Date(d), von: b[k][0] };
      d.setDate(d.getDate() + 1);
    }
    return null;
  }
  function tagName(n) { return n.tag === 0 ? "heute" : n.tag === 1 ? "morgen" : "am " + TAGE[n.datum.getDay()]; }
  function zeigeStatus() {
    var jetzt = berlin(), min = jetzt.getHours() * 60 + jetzt.getMinutes();
    alle("[data-status]").forEach(function (el) {
      var ort = el.getAttribute("data-status"), b = bloecke(ort, jetzt), tx = el.querySelector(".status-text");
      el.classList.remove("offen", "pause", "zu");
      for (var k = 0; k < b.length; k++) {
        if (min >= b[k][0] && min < b[k][1]) {
          el.classList.add("offen");
          tx.textContent = "Geöffnet bis " + uhr(b[k][1]);
          return;
        }
      }
      var n = naechste(ort, jetzt);
      if (n && n.tag === 0 && b.length && min >= b[0][1]) {
        el.classList.add("pause");
        tx.textContent = "Mittagspause, wieder ab " + uhr(n.von);
        return;
      }
      el.classList.add("zu");
      tx.textContent = n ? "Geschlossen, wieder " + tagName(n) + " ab " + uhr(n.von) : "Geschlossen";
    });
  }
  try { zeigeStatus(); setInterval(zeigeStatus, 60000); } catch (e) {}

  /* Vorschau: dieselbe Seite nach dem Umzug */
  var vor = document.querySelector("[data-vorschau]");
  if (vor) {
    vor.addEventListener("click", function () {
      var an = html.classList.toggle("nach-umzug");
      vor.setAttribute("aria-pressed", an ? "true" : "false");
      vor.textContent = an ? "Zurück zu heute" : "Website nach dem Umzug ansehen";
      document.querySelector(".tor-neu").hidden = !an;
      var kopfText = document.querySelector("#h-praxis");
      kopfText.textContent = an ? "Eine Adresse für alle" : "Zu welcher Praxis gehören Sie?";
      var unter = document.querySelector(".wahl-kopf p");
      unter.hidden = an;
      if (an) wahl.scrollIntoView({ block: "start" });
    });
  }

  /* Formular mit Weichen */
  var form = document.querySelector("[data-formular]");
  if (form) {
    var fehler = form.querySelector("[data-fehler]"), danke = document.querySelector("[data-danke]"), dankeText = document.querySelector("[data-danke-text]");
    var TEXTE = {
      neu: "Auf der fertigen Seite käme Ihre Anfrage jetzt bei der Anmeldung an.",
      frage: "Auf der fertigen Seite käme Ihre Nachricht jetzt bei der Anmeldung an.",
      hzv: "Auf der fertigen Seite wäre jetzt vermerkt, dass das Praxisteam Sie beim nächsten Besuch anspricht.",
      bewerbung: "Auf der fertigen Seite käme Ihre Bewerbung jetzt bei der Praxisorganisation an."
    };
    var weiche = function () {
      var w = form.querySelector("input[name=anliegen]:checked").value;
      alle("[data-teil=bewerbung]", form).forEach(function (el) { el.hidden = w !== "bewerbung"; });
    };
    alle("input[name=anliegen]", form).forEach(function (r) { r.addEventListener("change", weiche); });
    weiche();
    alle("[data-anliegen]").forEach(function (a) {
      a.addEventListener("click", function () {
        var r = form.querySelector('input[name=anliegen][value="' + a.getAttribute("data-anliegen") + '"]');
        if (r) r.checked = true;
        var st = a.getAttribute("data-stelle"), rs = st && form.querySelector('input[name=stelle][value="' + st + '"]');
        if (rs) rs.checked = true;
        weiche();
        if (danke && !danke.hidden) { danke.hidden = true; form.hidden = false; }
      });
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var tel = form.elements.telefon.value.trim(), mail = form.elements.mail.value.trim();
      fehler.hidden = !!(tel || mail);
      if (!tel && !mail) { form.elements.telefon.focus(); return; }
      dankeText.textContent = TEXTE[form.querySelector("input[name=anliegen]:checked").value];
      form.hidden = true; danke.hidden = false; danke.focus();
    });
    document.querySelector("[data-nochmal]").addEventListener("click", function () {
      form.reset(); weiche(); danke.hidden = true; form.hidden = false; fehler.hidden = true;
    });
  }
})();
