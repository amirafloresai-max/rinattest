/* ============================================================
   Калькулятор мероприятия.
   Шаг 1: площадка + формат. Шаг 2: вкладки с услугами.
   Итог пересчитывается сразу и показывается в нижней панели.
   ============================================================ */
(function () {
  const C = window.CALC;
  const PER_TABLE = 8;

  const st = {
    venue: null,
    type: null,
    started: false,
    tab: 0,
    d: { date: "", time: "", duration: 4, durationTouched: false, guests: 50, city: "msk", format: "", notes: "" },
    checks: {},
    qty: {},
    radios: {},
    contact: "Telegram",
  };

  // Радио-группы по умолчанию — первый вариант
  C.tabs.forEach(function (t) {
    t.groups.forEach(function (g) { if (g.type === "radio") st.radios[g.id] = g.items[0].id; });
  });

  const $ = function (id) { return document.getElementById(id); };
  const findType = function () { return C.eventTypes.find(function (t) { return t.id === st.type; }) || C.eventTypes[0]; };

  function tabs() {
    const list = [{ id: "details", title: "Детали" }];
    C.tabs.forEach(function (t) {
      if (!t.onlyIfVenue || t.onlyIfVenue === st.venue) list.push(t);
    });
    return list;
  }

  /* ---------- Цены ---------- */
  function tierPrice(item) {
    const g = st.d.guests;
    return item.tiers.find(function (t) { return g <= t.upTo; }).price;
  }
  function defaultQty(item) {
    switch (item.unit) {
      case "hour": return st.d.duration;
      case "guest": return st.d.guests;
      case "table": return Math.max(1, Math.ceil(st.d.guests / PER_TABLE));
      default: return 1;
    }
  }
  function qtyOf(item) { return st.qty[item.id] != null ? st.qty[item.id] : defaultQty(item); }
  function amountOf(item) {
    switch (item.unit) {
      case "tier": return tierPrice(item);
      case "hour": case "guest": case "unit": case "table": return item.price * qtyOf(item);
      default: return item.price;
    }
  }
  const UNIT_LABEL = { hour: "ч", guest: "гост.", unit: "шт", table: "стол." };
  function priceLabel(item) {
    switch (item.unit) {
      case "hour": return fmt(item.price) + " / час";
      case "guest": return fmt(item.price) + " / гость";
      case "unit": return fmt(item.price) + " / шт";
      case "table": return fmt(item.price) + " / стол";
      case "tier": return fmt(tierPrice(item));
      case "quote": return "от " + fmt(item.price);
      default: return item.price ? fmt(item.price) : "включено";
    }
  }

  function hostLine() {
    const t = findType();
    const extra = Math.max(0, st.d.duration - t.hours);
    return {
      title: "Ведение: " + t.label.toLowerCase(),
      detail: t.hours + " ч включено" + (extra ? " + " + extra + " ч × " + fmt(SITE.extraHour) : ""),
      amount: t.base + extra * SITE.extraHour,
    };
  }

  /* Все строки сметы: { group, title, detail, amount, quote } */
  function lines() {
    const out = [];
    const h = hostLine();
    out.push({ group: "Ведущий", title: h.title, detail: h.detail, amount: h.amount });

    const city = C.cities.find(function (c) { return c.id === st.d.city; });
    if (city && city.quote) out.push({ group: "Выезд", title: city.lineTitle, detail: "", amount: 0, quote: true });
    else if (city && city.price) out.push({ group: "Выезд", title: city.lineTitle, detail: "", amount: city.price });

    tabs().forEach(function (t) {
      if (!t.groups) return;
      t.groups.forEach(function (g) {
        if (g.type === "radio") {
          const it = g.items.find(function (i) { return i.id === st.radios[g.id]; });
          if (it && it.price) out.push({ group: t.title, title: (g.title ? g.title + ": " : "") + it.title, detail: "", amount: it.price });
          return;
        }
        g.items.forEach(function (it) {
          if (!st.checks[it.id]) return;
          if (it.unit === "quote") {
            out.push({ group: t.title, title: it.title, detail: "от " + fmt(it.price), amount: 0, quote: true });
            return;
          }
          const q = qtyOf(it);
          let detail = "";
          if (UNIT_LABEL[it.unit]) detail = q + " " + UNIT_LABEL[it.unit] + " × " + fmt(it.price);
          if (it.unit === "tier") detail = "на " + st.d.guests + " гостей";
          out.push({ group: t.title, title: it.title, detail: detail, amount: amountOf(it) });
        });
      });
    });
    return out;
  }

  function totals() {
    const ls = lines();
    return {
      lines: ls,
      total: ls.reduce(function (s, l) { return s + (l.quote ? 0 : l.amount); }, 0),
      quotes: ls.filter(function (l) { return l.quote; }).length,
      count: ls.filter(function (l) { return l.group !== "Ведущий" && l.group !== "Выезд"; }).length,
    };
  }

  function tabCount(t) {
    if (!t.groups) return 0;
    let n = 0;
    t.groups.forEach(function (g) {
      if (g.type === "radio") {
        const it = g.items.find(function (i) { return i.id === st.radios[g.id]; });
        if (it && it.price) n++;
      } else {
        g.items.forEach(function (it) { if (st.checks[it.id]) n++; });
      }
    });
    return n;
  }

  /* ---------- Шаг 1: выбор площадки и формата ---------- */
  function renderPickers() {
    $("venue-grid").innerHTML = C.venues.map(function (v) {
      return '<button type="button" class="sel-card" data-venue="' + v.id + '" aria-pressed="' + (st.venue === v.id) + '">' +
        '<span class="tick">' + icon("check", 12) + "</span>" + icon(v.icon, 24) + "<span>" + esc(v.label) + "</span></button>";
    }).join("");
    $("type-grid").innerHTML = C.eventTypes.map(function (t) {
      return '<button type="button" class="sel-card" data-type="' + t.id + '" aria-pressed="' + (st.type === t.id) + '">' +
        '<span class="tick">' + icon("check", 12) + "</span>" + icon(t.icon, 24) + "<span>" + esc(t.label) + "</span></button>";
    }).join("");
    const ready = st.venue && st.type;
    $("start-btn").disabled = !ready;
    $("start-hint").textContent = ready
      ? (st.started ? "Настройки обновлены — смета пересчитана" : "Отлично, можно собирать!")
      : "Выберите площадку и формат, чтобы начать";
  }

  function onPick(e) {
    const v = e.target.closest("[data-venue]");
    const t = e.target.closest("[data-type]");
    if (v) st.venue = v.getAttribute("data-venue");
    if (t) {
      st.type = t.getAttribute("data-type");
      if (!st.d.durationTouched) st.d.duration = findType().hours;
    }
    if (!v && !t) return;
    renderPickers();
    if (st.started) {
      st.tab = Math.min(st.tab, tabs().length - 1);
      renderBuilder();
    }
  }

  function start() {
    if (!st.venue || !st.type) return;
    st.started = true;
    $("builder").hidden = false;
    document.body.classList.add("has-summary");
    $("summary-bar").classList.add("show");
    renderPickers();
    renderBuilder();
    $("builder").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- Шаг 2: вкладки ---------- */
  function stepper(key, value, min, max, step) {
    return '<span class="stepper" data-stepper="' + key + '" data-min="' + min + '" data-max="' + max + '" data-step="' + (step || 1) + '">' +
      '<button type="button" data-d="-1" aria-label="Меньше">−</button>' +
      '<input type="number" inputmode="numeric" value="' + value + '" min="' + min + '" max="' + max + '" aria-label="Количество">' +
      '<button type="button" data-d="1" aria-label="Больше">+</button></span>';
  }

  function renderDetails() {
    const t = findType();
    return '<div class="panel-head"><h2>Детали мероприятия</h2><p>Базовые параметры влияют на стоимость ведения, DJ, фотографа и других почасовых услуг.</p></div>' +
      '<div class="form-grid">' +
        '<div class="field"><label for="f-date">Дата</label><input class="input" id="f-date" type="date" data-field="date" value="' + esc(st.d.date) + '"></div>' +
        '<div class="field"><label for="f-time">Начало</label><input class="input" id="f-time" type="time" data-field="time" value="' + esc(st.d.time) + '"></div>' +
        '<div class="field"><label for="f-city">Город</label><select id="f-city" data-field="city">' +
          C.cities.map(function (c) { return '<option value="' + c.id + '"' + (st.d.city === c.id ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="field"><label>Длительность, часов</label>' + stepper("duration", st.d.duration, 1, 14) +
          "<small>В базовую стоимость входит " + t.hours + " ч, далее " + fmt(SITE.extraHour) + "/час</small></div>" +
        '<div class="field"><label>Количество гостей</label>' + stepper("guests", st.d.guests, 5, 2000, 5) +
          "<small>Влияет на звук, мастер-классы и декор столов</small></div>" +
        '<div class="field"><label>Формат</label><div class="chips">' +
          C.formats.map(function (f) { return '<button type="button" class="chip" data-format="' + esc(f) + '" aria-pressed="' + (st.d.format === f) + '">' + esc(f) + "</button>"; }).join("") +
        "</div></div>" +
        '<div class="field full"><label for="f-notes">Пожелания</label><textarea id="f-notes" data-field="notes" placeholder="Тематика, особенности гостей, важные моменты…">' + esc(st.d.notes) + "</textarea></div>" +
      "</div>";
  }

  function renderItem(it, group) {
    const radio = group.type === "radio";
    const on = radio ? st.radios[group.id] === it.id : !!st.checks[it.id];
    let extra = "";
    if (!radio && on && ["hour", "guest", "unit", "table"].indexOf(it.unit) >= 0) {
      const label = { hour: "Часов", guest: "Гостей", unit: "Количество", table: "Столов" }[it.unit];
      extra = '<div class="qty">' + label + ": " + stepper("item:" + it.id, qtyOf(it), 1, 2000) +
        '<span class="sub">' + fmt(amountOf(it)) + "</span></div>";
    }
    return '<div class="item' + (radio ? " radio" : "") + (on ? " on" : "") + '" role="' + (radio ? "radio" : "checkbox") + '" aria-checked="' + on + '" tabindex="0" ' +
      'data-item="' + it.id + '" data-group="' + group.id + '" data-kind="' + group.type + '">' +
      '<span class="box">' + icon("check", 13) + "</span>" +
      '<div class="body"><div class="t"><span>' + esc(it.title) + '</span><span class="p">' + priceLabel(it) + "</span></div>" +
      (it.desc ? '<div class="d">' + esc(it.desc) + "</div>" : "") +
      (it.unit === "quote" ? '<span class="quote-tag">Под расчёт</span>' : "") +
      extra + "</div></div>";
  }

  function renderTab(t) {
    let html = '<div class="panel-head"><h2>' + esc(t.title) + "</h2><p>" + esc(t.intro) + "</p></div>";
    if (t.id === "host") {
      const h = hostLine();
      html += '<div class="host-core"><img src="assets/img/rinat-avatar.webp" alt="">' +
        '<div class="body"><b>Ринат — ' + esc(h.title.toLowerCase()) + "</b><p>" + esc(h.detail) + ". Длительность меняется во вкладке «Детали».</p></div>" +
        '<span class="p">' + fmt(h.amount) + "</span></div>";
    }
    t.groups.forEach(function (g) {
      if (g.title) html += '<div class="group-title">' + esc(g.title) + "</div>";
      else html += '<div style="height:6px"></div>';
      html += '<div class="items" role="' + (g.type === "radio" ? "radiogroup" : "group") + '">' +
        g.items.map(function (it) { return renderItem(it, g); }).join("") + "</div>";
    });
    return html;
  }

  function renderTabs() {
    const list = tabs();
    $("tabs").innerHTML = list.map(function (t, i) {
      const n = tabCount(t);
      return '<button type="button" role="tab" class="tab' + (i === st.tab ? " active" : "") + '" aria-selected="' + (i === st.tab) + '" data-tab="' + i + '">' +
        (i + 1) + ". " + esc(t.title) + (n ? '<span class="cnt">' + n + "</span>" : "") + "</button>";
    }).join("");
  }

  function renderBuilder() {
    const list = tabs();
    const t = list[st.tab];
    renderTabs();
    $("panel").innerHTML = '<div class="panel" role="tabpanel">' + (t.id === "details" ? renderDetails() : renderTab(t)) + "</div>";
    $("prev-btn").style.visibility = st.tab === 0 ? "hidden" : "visible";
    const last = st.tab === list.length - 1;
    $("next-btn").textContent = last ? "Смета и заявка →" : "Далее: " + list[st.tab + 1].title + " →";
    updateBar();
  }

  let lastTotal = 0;
  function updateBar() {
    const r = totals();
    $("sb-total").textContent = fmt(r.total);
    $("sb-meta").innerHTML =
      "Ведущий" + (r.count ? " + " + r.count + " " + plural(r.count, "услуга", "услуги", "услуг") : "") +
      (r.quotes ? '<br><span class="q">+ ' + r.quotes + " " + plural(r.quotes, "позиция", "позиции", "позиций") + " под расчёт</span>" : "");
    if (r.total !== lastTotal) {
      const el = $("sb-total");
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
      lastTotal = r.total;
    }
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function refreshPanelKeepScroll() {
    const y = window.scrollY;
    renderBuilder();
    window.scrollTo(0, y);
  }

  /* ---------- События панели ---------- */
  function toggleItem(el) {
    const id = el.getAttribute("data-item");
    const gid = el.getAttribute("data-group");
    if (el.getAttribute("data-kind") === "radio") st.radios[gid] = id;
    else st.checks[id] = !st.checks[id];
    refreshPanelKeepScroll();
    const again = document.querySelector('[data-item="' + id + '"]');
    if (again) again.focus({ preventScroll: true });
  }

  function applyStepper(key, value, rerender) {
    const wrap = document.querySelector('[data-stepper="' + key + '"]');
    const min = +wrap.getAttribute("data-min"), max = +wrap.getAttribute("data-max");
    let v = Math.round(+value);
    if (!isFinite(v)) return;
    v = Math.max(min, Math.min(max, v));
    if (key === "duration") { st.d.duration = v; st.d.durationTouched = true; }
    else if (key === "guests") st.d.guests = v;
    else if (key.indexOf("item:") === 0) st.qty[key.slice(5)] = v;
    if (rerender) refreshPanelKeepScroll();
    else updateBar();
  }

  function bindPanel() {
    const panel = $("panel");

    panel.addEventListener("click", function (e) {
      const stepBtn = e.target.closest(".stepper button");
      if (stepBtn) {
        e.stopPropagation();
        const wrap = stepBtn.closest(".stepper");
        const input = wrap.querySelector("input");
        const step = +wrap.getAttribute("data-step");
        applyStepper(wrap.getAttribute("data-stepper"), +input.value + step * +stepBtn.getAttribute("data-d"), true);
        const again = document.querySelector('[data-stepper="' + wrap.getAttribute("data-stepper") + '"] button[data-d="' + stepBtn.getAttribute("data-d") + '"]');
        if (again) again.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest(".stepper")) return;
      const chip = e.target.closest("[data-format]");
      if (chip) {
        const f = chip.getAttribute("data-format");
        st.d.format = st.d.format === f ? "" : f;
        panel.querySelectorAll("[data-format]").forEach(function (c) {
          c.setAttribute("aria-pressed", String(c.getAttribute("data-format") === st.d.format));
        });
        return;
      }
      const item = e.target.closest("[data-item]");
      if (item) toggleItem(item);
    });

    panel.addEventListener("keydown", function (e) {
      const item = e.target.closest("[data-item]");
      if (item && e.target === item && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        toggleItem(item);
      }
    });

    panel.addEventListener("input", function (e) {
      const f = e.target.getAttribute("data-field");
      if (f) { st.d[f] = e.target.value; updateBar(); return; }
      const wrap = e.target.closest(".stepper");
      if (wrap && e.target.value !== "") applyStepper(wrap.getAttribute("data-stepper"), e.target.value, false);
    });

    panel.addEventListener("change", function (e) {
      const wrap = e.target.closest(".stepper");
      if (wrap) applyStepper(wrap.getAttribute("data-stepper"), e.target.value || wrap.getAttribute("data-min"), true);
      if (e.target.getAttribute("data-field") === "city") updateBar();
    });

    $("tabs").addEventListener("click", function (e) {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      st.tab = +b.getAttribute("data-tab");
      renderBuilder();
      b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });

    function go(d) {
      const n = tabs().length;
      if (st.tab + d >= n) { openEstimate(); return; }
      st.tab = Math.max(0, st.tab + d);
      renderBuilder();
      $("builder").scrollIntoView({ behavior: "smooth" });
      const active = document.querySelector(".tab.active");
      if (active) active.scrollIntoView({ block: "nearest", inline: "center" });
    }
    $("prev-btn").addEventListener("click", function () { go(-1); });
    $("next-btn").addEventListener("click", function () { go(1); });
  }

  /* ---------- Смета и заявка (модальное окно) ---------- */
  function openEstimate() {
    const r = totals();
    const typeLabel = findType().label;
    const venue = C.venues.find(function (v) { return v.id === st.venue; });
    let html = '<h2 id="estimate-title">Ваша смета</h2>' +
      "<p>" + esc(typeLabel) + " · " + esc(venue ? venue.label : "") + " · " + st.d.guests + " гостей · " + st.d.duration + " ч" +
      (st.d.date ? " · " + esc(new Date(st.d.date).toLocaleDateString("ru-RU")) : "") + "</p>" +
      '<div class="estimate">';
    let group = "";
    r.lines.forEach(function (l) {
      if (l.group !== group) { group = l.group; html += '<div class="grp">' + esc(group) + "</div>"; }
      html += '<div class="ln"><span>' + esc(l.title) + (l.detail ? "<small>" + esc(l.detail) + "</small>" : "") + "</span>" +
        (l.quote ? '<span class="q">под расчёт</span>' : "<span>" + fmt(l.amount) + "</span>") + "</div>";
    });
    html += '<div class="total"><span>Итого предварительно</span><b>' + fmt(r.total) + "</b></div>";
    if (r.quotes) html += '<p style="color:var(--gold);font-size:.8rem;margin-top:6px">+ ' + r.quotes + " " + plural(r.quotes, "позиция", "позиции", "позиций") + " под индивидуальный расчёт</p>";
    html += "</div>" +
      '<form id="lead-form" novalidate>' +
        '<div class="form-grid" style="grid-template-columns:1fr 1fr">' +
          '<div class="field"><label for="l-name">Имя</label><input class="input" id="l-name" required autocomplete="name" placeholder="Как к вам обращаться"></div>' +
          '<div class="field"><label for="l-phone">Телефон</label><input class="input" id="l-phone" required type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__"></div>' +
          '<div class="field full"><label>Где удобнее ответить</label><div class="chips">' +
            ["Telegram", "WhatsApp", "Звонок"].map(function (c) {
              return '<button type="button" class="chip" data-contact="' + c + '" aria-pressed="' + (st.contact === c) + '">' + c + "</button>";
            }).join("") +
          "</div></div>" +
        "</div>" +
        '<p id="lead-error" style="color:#e58c8c;font-size:.82rem;margin-top:12px;display:none">Укажите имя и телефон</p>' +
        '<button type="submit" class="btn btn-gold" style="width:100%;margin-top:20px">Отправить заявку Ринату</button>' +
        '<p style="color:var(--dim);font-size:.74rem;margin-top:10px;text-align:center">' + esc(SITE.depositNote) + "</p>" +
      "</form>";
    $("estimate-content").innerHTML = html;
    $("estimate-modal").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function () { $("l-name").focus(); }, 50);
  }

  function closeEstimate() {
    $("estimate-modal").classList.remove("open");
    document.body.style.overflow = "";
  }

  function bindModal() {
    const modal = $("estimate-modal");
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest("[data-close]")) { closeEstimate(); return; }
      const c = e.target.closest("[data-contact]");
      if (c) {
        st.contact = c.getAttribute("data-contact");
        modal.querySelectorAll("[data-contact]").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.getAttribute("data-contact") === st.contact));
        });
      }
    });
    modal.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = $("l-name").value.trim();
      const phone = $("l-phone").value.trim();
      if (!name || phone.replace(/\D/g, "").length < 10) {
        $("lead-error").style.display = "block";
        return;
      }
      // Демо: заявка никуда не отправляется. В полной версии — Telegram-бот / CRM.
      $("estimate-content").innerHTML =
        '<div class="success"><div class="ok">' + icon("check", 30) + "</div>" +
        '<h2 id="estimate-title" style="padding:0">Заявка принята!</h2>' +
        '<p style="color:var(--muted);margin:10px auto 22px;max-width:400px">Спасибо, ' + esc(name) + ". Ринат свяжется с вами через " + esc(st.contact) +
        " в ближайшее время. <br><br><small style=\"color:var(--dim)\">Демо-режим: заявка никуда не отправлена.</small></p>" +
        '<button type="button" class="btn btn-ghost" data-close>Вернуться к смете</button></div>';
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("open")) closeEstimate();
    });
    $("open-estimate").addEventListener("click", openEstimate);
  }

  /* ---------- Старт ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const preType = params.get("type");
    if (preType && C.eventTypes.some(function (t) { return t.id === preType; })) {
      st.type = preType;
      st.d.duration = findType().hours;
    }
    renderPickers();
    document.querySelector(".calc-intro").addEventListener("click", onPick);
    $("start-btn").addEventListener("click", start);
    bindPanel();
    bindModal();
  });
})();
