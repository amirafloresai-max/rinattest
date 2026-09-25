/* ============================================================
   Главная: орбита планет вокруг Рината + страницы услуг.
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const planetById = {};
  PLANETS.forEach(function (p) { planetById[p.id] = p; });

  function planetAction(p) {
    if (p.id === "calc") { window.location.href = "calculator.html"; return; }
    if (p.id === "ask") { window.Assistant && window.Assistant.open(); return; }
    window.location.hash = "#/" + p.id;
  }

  /* ---------- Орбита ---------- */
  function initOrbit() {
    const area = document.getElementById("orbit");
    const rings = area.querySelectorAll(".orbit-ring");
    const els = PLANETS.map(function (p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "planet" + (p.featured ? " featured" : "");
      b.setAttribute("aria-label", p.label.replace("\n", " "));
      b.innerHTML =
        '<span class="planet-sphere"></span><span class="planet-label">' + esc(p.label) + "</span>";
      b.addEventListener("click", function () { planetAction(p); });
      area.appendChild(b);
      return { p: p, el: b, sphere: b.querySelector(".planet-sphere") };
    });

    const angles = PLANETS.map(function (_, i) { return (i * 360) / PLANETS.length + 90; });
    let rx = 300, ry = 80;

    function layout() {
      const w = area.clientWidth;
      const vw = window.innerWidth;
      const k = vw <= 480 ? 0.66 : vw <= 768 ? 0.8 : 1;
      rx = Math.min(w * 0.44, 400);
      ry = rx * (vw <= 480 ? 0.46 : 0.27);
      rings[0].style.width = rx * 2 + "px";
      rings[0].style.height = ry * 2 + "px";
      rings[1].style.width = rx * 2.3 + "px";
      rings[1].style.height = ry * 2.3 + "px";
      els.forEach(function (o) {
        const s = Math.round(o.p.size * k);
        o.sphere.style.width = s + "px";
        o.sphere.style.height = s + "px";
        o.sphere.style.background = o.p.sphere;
        o.sphere.style.boxShadow =
          "inset -" + s * 0.1 + "px -" + s * 0.12 + "px " + s * 0.25 + "px rgba(0,0,0,.45), 0 0 " + s * 0.6 + "px " + o.p.accent + "40";
        o.sphere.innerHTML = icon(o.p.icon, Math.round(s * 0.42));
      });
    }

    let speed = vwSpeed();
    let target = speed;
    function vwSpeed() { return window.innerWidth <= 768 ? 10 : 7; }

    function place() {
      els.forEach(function (o, i) {
        const a = (angles[i] * Math.PI) / 180;
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry;
        const depth = Math.sin(a); // > 0 — ближе к зрителю (ниже), < 0 — за Ринатом
        const front = depth > 0;
        const scale = front ? 0.92 + depth * 0.12 : 0.62 + (1 + depth) * 0.3;
        o.el.style.transform =
          "translate(calc(-50% + " + x.toFixed(1) + "px), calc(-50% + " + y.toFixed(1) + "px)) scale(" + scale.toFixed(3) + ")";
        o.el.style.zIndex = front ? "5" : "2";
        o.el.style.opacity = front ? "1" : (0.4 + (1 + depth) * 0.45).toFixed(2);
      });
    }

    let last = performance.now();
    function tick(t) {
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      speed += (target - speed) * 0.08;
      for (let i = 0; i < angles.length; i++) angles[i] += speed * dt;
      place();
      requestAnimationFrame(tick);
    }

    // Замедляем вращение, когда пользователь целится в планету
    area.addEventListener("pointerenter", function () { target = 1.2; });
    area.addEventListener("pointerleave", function () { target = vwSpeed(); });
    area.addEventListener("focusin", function () { target = 0; });
    area.addEventListener("focusout", function () { target = vwSpeed(); });

    layout();
    place();
    window.addEventListener("resize", function () { layout(); target = vwSpeed(); });
    if (!reduceMotion) requestAnimationFrame(tick);

    document.getElementById("hero-person").addEventListener("click", function () {
      document.getElementById("about").scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ---------- Карточки услуг ---------- */
  function renderServices() {
    const grid = document.getElementById("services-grid");
    grid.innerHTML = Object.keys(SERVICES).map(function (id) {
      const s = SERVICES[id], p = planetById[id];
      return (
        '<a class="card service-card" href="#/' + id + '">' +
        '<span class="sc-ico">' + icon(p.icon, 22) + "</span>" +
        "<h3>" + esc(p.label.replace("\n", " ")) + "</h3>" +
        "<p>" + esc(s.lead) + "</p>" +
        '<span class="sc-price"><span>' + esc(s.price) + "</span><span>→</span></span></a>"
      );
    }).join("");
  }

  function renderPlaceholders(root) {
    root.querySelectorAll("[data-ph]").forEach(function (el) {
      el.innerHTML = icon("image", 26) + "<span>" + esc(el.getAttribute("data-ph")) + "<br>фото / видео</span>";
    });
    root.querySelectorAll("[data-stars]").forEach(function (el) {
      el.innerHTML = new Array(5).fill(icon("star", 15)).join("");
    });
  }

  /* ---------- Страница планеты ---------- */
  const STEPS = [
    ["Заявка", "Калькулятор, ассистент или звонок — как удобно."],
    ["Созвон", "Обсуждаем формат, гостей и пожелания, фиксируем смету."],
    ["Сценарий", "Готовлю программу и согласую её с вами и подрядчиками."],
    ["Мероприятие", "Веду вечер, а вы просто наслаждаетесь праздником."],
  ];

  function renderDetail(id) {
    const s = SERVICES[id], p = planetById[id];
    const calcHref = "calculator.html" + (id !== "show" ? "?type=" + id : "");
    const view = document.getElementById("view-detail");
    view.innerHTML =
      '<div class="detail-bar"><div class="container"><a class="back-link" href="#top">' + icon("arrowLeft", 16) + " Назад во вселенную</a></div></div>" +
      '<div class="container">' +
        '<section class="detail-hero">' +
          "<div>" +
            '<span class="eyebrow">' + esc(s.eyebrow) + "</span>" +
            "<h1>" + esc(s.title) + "</h1>" +
            '<p class="lead">' + esc(s.lead) + "</p>" +
            '<div class="row">' +
              '<a class="btn btn-gold" href="' + calcHref + '">Рассчитать стоимость</a>' +
              '<a class="btn btn-ghost" href="#" data-ask="' + esc("Расскажите подробнее: " + p.label.replace("\n", " ").toLowerCase()) + '">Задать вопрос</a>' +
            "</div>" +
          "</div>" +
          '<div class="price-orb" style="background:' + p.sphere + ";--orb-glow:" + p.accent + '55">' +
            icon(p.icon, 42) + "<b>" + esc(s.price) + "</b><span>" + esc(s.priceNote) + "</span>" +
          "</div>" +
        "</section>" +
      "</div>" +
      '<section class="section"><div class="container">' +
        '<div class="section-head"><span class="eyebrow">Что входит</span><h2>Всё для спокойного праздника</h2></div>' +
        '<div class="includes">' +
          s.includes.map(function (it, i) {
            return '<div class="card"><span class="num">0' + (i + 1) + "</span><b>" + esc(it[0]) + "</b><p>" + esc(it[1]) + "</p></div>";
          }).join("") +
        "</div>" +
      "</div></section>" +
      '<section class="section"><div class="container">' +
        '<div class="section-head"><span class="eyebrow">Как работаем</span><h2>Четыре шага до события</h2></div>' +
        '<div class="includes">' +
          STEPS.map(function (it, i) {
            return '<div class="card"><span class="num">ШАГ ' + (i + 1) + "</span><b>" + esc(it[0]) + "</b><p>" + esc(it[1]) + "</p></div>";
          }).join("") +
        "</div>" +
      "</div></section>" +
      '<section class="section"><div class="container">' +
        '<div class="section-head"><span class="eyebrow">Портфолио</span><h2>Как это выглядит</h2></div>' +
        '<div class="detail-gallery"><div class="ph" data-ph="Фото 1"></div><div class="ph" data-ph="Фото 2"></div><div class="ph" data-ph="Видео"></div></div>' +
      "</div></section>" +
      (s.faq.length
        ? '<section class="section"><div class="container">' +
            '<div class="section-head center"><span class="eyebrow center">Вопросы</span><h2>Частые вопросы</h2></div>' +
            '<div class="faq">' +
              s.faq.map(function (f) { return "<details><summary>" + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>"; }).join("") +
            "</div>" +
          "</div></section>"
        : "") +
      '<section class="section"><div class="container"><div class="cta-block">' +
        '<span class="eyebrow center">Следующий шаг</span>' +
        "<h2>Узнайте стоимость вашего события</h2>" +
        "<p>Калькулятор соберёт смету за пару минут: ведущий, музыка, шоу, фото и декор.</p>" +
        '<div class="row"><a class="btn btn-gold" href="' + calcHref + '">Открыть калькулятор</a>' +
        '<a class="btn btn-ghost" href="#top">Вернуться во вселенную</a></div>' +
      "</div></div></section>";
    renderPlaceholders(view);
  }

  /* ---------- Роутинг: #/wedding и т.п. ---------- */
  function route() {
    const hash = window.location.hash;
    const hub = document.getElementById("view-hub");
    const detail = document.getElementById("view-detail");
    const m = hash.match(/^#\/(\w+)/);
    if (m && SERVICES[m[1]]) {
      renderDetail(m[1]);
      hub.hidden = true;
      detail.hidden = false;
      window.scrollTo(0, 0);
      document.title = planetById[m[1]].label.replace("\n", " ") + " — Ринат, ведущий мероприятий";
      return;
    }
    const wasDetail = !detail.hidden;
    detail.hidden = true;
    hub.hidden = false;
    document.title = "Ринат — ведущий мероприятий";
    const target = hash && hash.length > 1 && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: wasDetail ? "auto" : "smooth" });
    else if (wasDetail) window.scrollTo(0, 0);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderServices();
    renderPlaceholders(document);
    initOrbit();
    route();
    window.addEventListener("hashchange", route);
  });
})();
