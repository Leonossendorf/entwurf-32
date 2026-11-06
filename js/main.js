/* Hausarztpraxis Metelen, Entwurf. Kein Tracking, keine fremden Dienste. */
(function () {
  "use strict";
  var html = document.documentElement;
  html.classList.add("js");

  /* Einstellungen zur Ansicht merken, wenn der Browser es erlaubt */
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

  /* Ansicht anpassen */
  var ansicht = document.getElementById("ansicht"), ansichtAuf = document.querySelector("[data-hilfe-auf]");
  if (ansicht && ansichtAuf) {
    ansichtAuf.addEventListener("click", function () {
      var auf = ansicht.hidden;
      ansicht.hidden = !auf;
      ansichtAuf.setAttribute("aria-expanded", auf ? "true" : "false");
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

  /* Menü auf dem Handy, aktuelle Seite markieren */
  var mk = document.querySelector(".menue-knopf"), menue = document.getElementById("hauptmenue");
  if (mk && menue) {
    mk.addEventListener("click", function () {
      var auf = menue.classList.toggle("offen");
      mk.setAttribute("aria-expanded", auf ? "true" : "false");
    });
    alle("a", menue).forEach(function (a) { a.addEventListener("click", function () { menue.classList.remove("offen"); mk.setAttribute("aria-expanded", "false"); }); });
  }
  var datei = location.pathname.split("/").pop() || "index.html";
  alle("#hauptmenue a").forEach(function (a) {
    var ziel = a.getAttribute("href").split("#")[0];
    if (ziel && ziel === datei) a.setAttribute("aria-current", "page");
    if (ziel === "leistungen.html" && /^leistung-/.test(datei)) a.setAttribute("aria-current", "page");
  });

  /* Status je Standort. Eine Quelle für beide: hier ändern, überall richtig. Stand November 2026. */
  var ZEITEN = {
    w: { 1: [[450, 720], [840, 1020]], 2: [[450, 720], [840, 1020]], 3: [[450, 720]], 4: [[450, 720], [840, 1020]], 5: [[450, 720]] },
    s: { 1: [[450, 720], [900, 1080]], 2: [[450, 720], [900, 1080]], 3: [[450, 780]], 4: [[450, 720], [900, 1080]], 5: [[450, 780]] }
  };
  var TELEFON_W = { 1: [[510, 720], [900, 1020]], 2: [[510, 720], [900, 1020]], 3: [[510, 720]], 4: [[510, 720], [900, 1020]], 5: [[510, 720]] };
  var ZU = { w: [], s: ["2026-12-28"] };
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
  function drin(b, min) { for (var k = 0; k < b.length; k++) if (min >= b[k][0] && min < b[k][1]) return b[k]; return null; }
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
    var jetzt = berlin(), min = jetzt.getHours() * 60 + jetzt.getMinutes(), offen = 0;
    alle("[data-status]").forEach(function (el) {
      var ort = el.getAttribute("data-status"), b = bloecke(ort, jetzt), tx = el.querySelector(".status-text"), t = drin(b, min);
      el.classList.remove("offen", "pause", "zu");
      if (t) { offen++; el.classList.add("offen"); tx.textContent = "Geöffnet bis " + uhr(t[1]); return; }
      var n = naechste(ort, jetzt);
      if (n && n.tag === 0 && b.length && min >= b[0][1]) { el.classList.add("pause"); tx.textContent = "Mittagspause, wieder ab " + uhr(n.von); return; }
      el.classList.add("zu");
      tx.textContent = n ? "Geschlossen, wieder " + tagName(n) + " ab " + uhr(n.von) : "Geschlossen";
    });
    var j = document.querySelector("[data-jetzt]");
    if (j) {
      var tel = FEIERTAGE.indexOf(iso(jetzt)) < 0 && drin(TELEFON_W[jetzt.getDay()] || [], min);
      j.textContent = offen === 0 ? "Beide Praxen sind gerade geschlossen." : tel ? "Die Praxis ist gerade erreichbar." : "Die Praxis ist geöffnet, das Telefon an der Wettringener Straße ist gerade nicht besetzt.";
    }
  }
  try { zeigeStatus(); setInterval(zeigeStatus, 60000); } catch (e) {}


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
    var ziel = (location.hash || "").match(/^#kontakt-(\w+)/);
    if (ziel) {
      var vor = form.querySelector('input[name=anliegen][value="' + ziel[1] + '"]');
      if (vor) { vor.checked = true; weiche(); document.getElementById("kontakt").scrollIntoView(); }
    }
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

  /* Hilfe-Seiten: erst die Frage nach der Ärztin oder dem Arzt, dann nur die passenden Schritte. Nichts ist vorausgewählt. */
  var ORT = { weritz: "w", schoen: "w", gruetzner: "w", niehoff: "s", viermann: "s", niesen: "s" };
  var ARTEN = { weritz: "Bei Frau Weritz: Sprechstunde 10min Termin", schoen: "Bei Frau Schön: Sprechstunde 10min Termin" };
  var bogen = document.querySelector("[data-fragebogen]");
  if (bogen) {
    var zeige = function () {
      var r = bogen.querySelector("input[name=arzt]:checked"), a = r ? r.value : null, ort = a ? ORT[a] : null;
      var f = bogen.querySelector("input[name=fall]:checked"), fall = f ? f.value : null;
      alle("[data-nur-ort]", bogen).forEach(function (el) { el.hidden = el.getAttribute("data-nur-ort") !== ort; });
      if (f && f.closest("[data-nur-ort]") && f.closest("[data-nur-ort]").hidden) { f.checked = false; f = null; fall = null; }
      if (!f && ort) {
        var erste = alle("input[name=fall]", bogen).filter(function (i) { return !i.closest("[hidden]"); })[0];
        if (erste) { erste.checked = true; fall = erste.value; }
      }
      alle("[data-ort]").forEach(function (el) { el.hidden = el.getAttribute("data-ort") !== ort; });
      alle("[data-fall]").forEach(function (el) { el.hidden = el.getAttribute("data-fall").split(" ").indexOf(fall) < 0; });
      alle("[data-bitte]").forEach(function (el) { el.hidden = !!ort; });
      alle("[data-sprechstunde-art]").forEach(function (el) { el.textContent = ARTEN[a] || "Bei Frau Weritz oder Frau Schön: Sprechstunde 10min Termin"; });
      alle("[data-nur-arzt]").forEach(function (el) { el.hidden = el.getAttribute("data-nur-arzt") !== a || fall !== "sprechstunde"; });
    };
    alle("input", bogen).forEach(function (i) { i.addEventListener("change", zeige); });
    zeige();
  }
})();
