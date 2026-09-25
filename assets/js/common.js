/* ============================================================
   Общее: фон с огнями, форматирование, ассистент (демо).
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.fmt = function (n) {
    return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
  };

  window.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------- Фон: мерцающие огни (как огни города на фото) ---------- */
  function initLights() {
    const host = document.querySelector(".lights");
    if (!host) return;
    const canvas = document.createElement("canvas");
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let w, h, dpr, dots = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 9000);
      dots = [];
      for (let i = 0; i < count; i++) {
        const bokeh = Math.random() < 0.06;
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: bokeh ? 6 + Math.random() * 14 : 0.4 + Math.random() * 1.3,
          a: bokeh ? 0.03 + Math.random() * 0.05 : 0.15 + Math.random() * 0.6,
          warm: Math.random() < 0.7,
          speed: 0.4 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
          drift: (Math.random() - 0.5) * 0.06,
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        const tw = reduceMotion ? 1 : 0.55 + 0.45 * Math.sin(t / 1000 * d.speed + d.phase);
        const col = d.warm ? "242,210,150" : "220,225,255";
        if (d.r > 3) {
          const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
          g.addColorStop(0, "rgba(" + col + "," + d.a * tw + ")");
          g.addColorStop(1, "rgba(" + col + ",0)");
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = "rgba(" + col + "," + d.a * tw + ")";
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduceMotion) {
          d.y += d.drift;
          if (d.y < -20) d.y = h + 20;
          if (d.y > h + 20) d.y = -20;
        }
      }
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(draw);
  }

  /* ---------- Ассистент (заготовка) ----------
     Сейчас отвечает шаблонами по ключевым словам.
     В полной версии функцию reply() заменим на запрос к ИИ. */
  const S = window.SITE;
  const calcLink = '<a class="btn btn-gold btn-sm" href="calculator.html">Открыть калькулятор</a>';

  const RULES = [
    { re: /свадьб/i, text: "Ведение свадьбы — от 60 000 ₽ за 5 часов. В стоимость входят встреча-знакомство, сценарий под пару и работа с подрядчиками.\nТочную сумму с DJ, декором и шоу можно собрать в калькуляторе.", html: calcLink },
    { re: /корпорат/i, text: "Корпоратив — от 50 000 ₽ за 4 часа. Работаю по договору и предоставляю закрывающие документы.", html: calcLink },
    { re: /(цен|стоим|сколько|прайс|бюджет)/i, text: "Ведение стоит от 35 000 ₽ (деловые события) до 60 000 ₽ (свадьба). Доп. час — 8 000 ₽.\nУдобнее всего собрать смету в калькуляторе — сумма считается сразу.", html: calcLink },
    { re: /(дат|свобод|занят|календар)/i, text: "В полной версии я покажу свободные даты Рината прямо здесь.\nПока напишите желаемую дату и телефон — Ринат подтвердит лично." },
    { re: /(брон|предоплат|аванс|договор)/i, text: "Дата бронируется после предоплаты 30% по договору. Остаток — в день мероприятия." },
    { re: /(город|выезд|область|командиров)/i, text: "По Москве выезд бесплатный, по области — 5 000 ₽. Другие города рассчитываются индивидуально." },
    { re: /(входит|включ|пакет)/i, text: "В ведение входят бриф, сценарий, согласование с подрядчиками и само ведение. Пакеты «Премиум» и «Под ключ» добавляют индивидуальный сценарий, репетицию и режиссуру." },
    { re: /(dj|диджей|музык|звук|артист|шоу)/i, text: "Подберу DJ, звук, свет, кавер-группу, иллюзиониста и спецэффекты. Всё это можно отметить во вкладках калькулятора.", html: calcLink },
    { re: /(привет|здравств|добрый)/i, text: "Здравствуйте! Чем могу помочь? Могу рассказать о ценах, форматах и свободных датах." },
    { re: /(\+?\d[\d\s\-()]{8,})/, text: "Спасибо! Номер получен (в демо-версии он никуда не отправляется). В рабочей версии Ринат перезвонит в течение часа." },
  ];
  const FALLBACK =
    "Это демо-версия ассистента: в полной версии здесь будет ИИ, который знает все услуги, цены и свободные даты Рината.\nПока можно открыть калькулятор или оставить номер телефона.";

  function reply(q) {
    for (const r of RULES) if (r.re.test(q)) return r;
    return { text: FALLBACK, html: calcLink };
  }

  function initAssistant() {
    const avatar = "assets/img/rinat-avatar.webp";
    const launcher = document.createElement("button");
    launcher.className = "chat-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Открыть чат с ассистентом");
    launcher.innerHTML =
      '<img src="' + avatar + '" alt=""><i class="dot"></i><div class="txt"><b>Задать вопрос</b><span>Ассистент онлайн</span></div>';

    const panel = document.createElement("section");
    panel.className = "chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Ассистент Рината");
    panel.innerHTML =
      '<div class="chat-head"><img src="' + avatar + '" alt="">' +
      '<div class="who"><b>Ассистент Рината</b><span>онлайн</span></div>' +
      '<em class="demo">демо</em>' +
      '<button type="button" class="chat-close" aria-label="Закрыть">' + icon("close", 16) + "</button></div>" +
      '<div class="chat-body" aria-live="polite"></div>' +
      '<div class="chat-quick"></div>' +
      '<form class="chat-form"><label class="sr-only" for="chat-input">Ваш вопрос</label>' +
      '<input id="chat-input" class="input" autocomplete="off" placeholder="Напишите вопрос…">' +
      '<button type="submit" aria-label="Отправить">' + icon("send", 18) + "</button></form>";

    document.body.append(launcher, panel);

    const body = panel.querySelector(".chat-body");
    const quick = panel.querySelector(".chat-quick");
    const form = panel.querySelector(".chat-form");
    const input = panel.querySelector("#chat-input");
    let greeted = false;

    const QUICK = ["Сколько стоит свадьба?", "Свободна ли дата?", "Что входит в ведение?", "Как забронировать?"];
    quick.innerHTML = QUICK.map(function (q) { return '<button type="button">' + esc(q) + "</button>"; }).join("");
    quick.addEventListener("click", function (e) {
      const b = e.target.closest("button");
      if (b) ask(b.textContent);
    });

    function add(who, text, html) {
      const m = document.createElement("div");
      m.className = "msg " + who;
      m.textContent = text;
      if (html) {
        const extra = document.createElement("div");
        extra.innerHTML = html;
        m.appendChild(extra);
      }
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
    }

    function botSay(r) {
      const t = document.createElement("div");
      t.className = "msg bot typing";
      t.innerHTML = "<i></i><i></i><i></i>";
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
      setTimeout(function () {
        t.remove();
        add("bot", r.text, r.html);
      }, 650 + Math.random() * 600);
    }

    function ask(q) {
      q = q.trim();
      if (!q) return;
      add("me", q);
      quick.style.display = "none";
      botSay(reply(q));
    }

    function open(prefill) {
      panel.classList.add("open");
      launcher.style.visibility = "hidden";
      const firstOpen = !greeted;
      if (firstOpen) {
        greeted = true;
        botSay({ text: "Здравствуйте! Я ассистент ведущего Рината.\nПодскажу по ценам, форматам и свободным датам. Что планируете?" });
      }
      if (prefill) setTimeout(function () { ask(prefill); }, firstOpen ? 1400 : 50);
      setTimeout(function () { input.focus({ preventScroll: true }); }, 300);
    }
    function close() {
      panel.classList.remove("open");
      launcher.style.visibility = "";
      launcher.focus({ preventScroll: true });
    }

    launcher.addEventListener("click", function () { open(); });
    panel.querySelector(".chat-close").addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      ask(input.value);
      input.value = "";
    });

    window.Assistant = { open: open, close: close };
    document.addEventListener("click", function (e) {
      const t = e.target.closest("[data-ask]");
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute("data-ask") || "");
    });
  }

  /* ---------- Контакты из data.js ---------- */
  function fillContacts() {
    document.querySelectorAll("[data-site]").forEach(function (el) {
      const key = el.getAttribute("data-site");
      if (S[key]) el.textContent = S[key];
    });
    document.querySelectorAll("[data-site-href]").forEach(function (el) {
      const key = el.getAttribute("data-site-href");
      if (S[key]) el.setAttribute("href", S[key]);
    });
    document.querySelectorAll("[data-icon]").forEach(function (el) {
      el.innerHTML = icon(el.getAttribute("data-icon"), +el.getAttribute("data-size") || 18);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillContacts();
    initLights();
    initAssistant();
  });
})();
