/* ============================================================
   A Very Official Spider-Man Invitation
   ============================================================ */

(function () {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORE_KEY = "spidey-invite-v1";
  const CAN_HOVER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const REDUCED   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    to: "you",
    date: null,   // "YYYY-MM-DD"
    time: null,   // "HH:MM"
    place: null,
    foods: [],
    customFood: ""
  };

  /* ---------------------------------------------------------- storage */

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------- screens */

  let current = "screen-boot";

  function show(id) {
    const next = document.getElementById(id);
    if (!next) return;
    $$(".screen").forEach(s => s.classList.remove("is-active"));
    next.classList.add("is-active");
    current = id;
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------- confetti */

  const CONFETTI_COLORS = ["#e62429", "#2b5df2", "#ffd23f", "#ffffff", "#ff5c8a"];

  function confetti(count = 70) {
    if (REDUCED) return;
    const layer = $("#confetti");
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("i");
      bit.className = "confetti-bit";
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      bit.style.animationDuration = (2 + Math.random() * 2.2) + "s";
      bit.style.animationDelay = (Math.random() * 0.6) + "s";
      layer.appendChild(bit);
      setTimeout(() => bit.remove(), 5200);
    }
  }

  /* ---------------------------------------------------------- boot */

  const BOOT_LINES = [
    "> SPIDEY_INVITE.EXE",
    "> loading web-shooters .... OK",
    "> loading snacks ......... OK",
    "> loading courage ........ 68%",
    "> ready."
  ];

  function runBoot() {
    const log = $("#bootLog");
    const fill = $("#loadbarFill");
    let line = 0;

    (function nextLine() {
      if (line >= BOOT_LINES.length) {
        fill.style.width = "100%";
        const btn = $("#startBtn");
        btn.hidden = false;
        btn.focus({ preventScroll: true });
        return;
      }
      log.textContent += (line ? "\n" : "") + BOOT_LINES[line];
      line++;
      fill.style.width = Math.round((line / BOOT_LINES.length) * 100) + "%";
      setTimeout(nextLine, REDUCED ? 60 : 420);
    })();
  }

  /* ---------------------------------------------------------- the question */

  const NO_LABELS = [
    "NO",
    "no?",
    "are you sure?",
    "really sure??",
    "think about it",
    "spidey is upset",
    "last chance…",
    "ok fine — YES"
  ];

  const YES_LABELS = [
    "YES",
    "YES!!",
    "YES!!!",
    "OBVIOUSLY YES",
    "ABSOLUTELY YES",
    "DEFINITELY YES"
  ];

  const BUBBLES = [
    "a very official invitation",
    "hm.",
    "that button is a bit broken",
    "you can't actually click that one",
    "spidey took that personally",
    "he's crying now. look what you did",
    "the No button has resigned",
    "see? only one option here",
    "correct. it was always yes."
  ];

  const MAX_YES_SCALE = 1.75;

  // How big Yes is (or is about to be) after the current escalation.
  const yesScale = () => Math.min(1 + attempts * 0.11, MAX_YES_SCALE);

  let attempts = 0;
  let surrendered = false;
  let lastDodge = 0;

  const yesBtn = $("#yesBtn");
  const noBtn  = $("#noBtn");
  const field  = $("#choiceField");
  const sprite = $("#askSprite");
  const bubble = $("#bubbleText");

  function dodge() {
    if (surrendered) return;

    // Lock the field's height before the button leaves the flow, so the
    // panel doesn't collapse underneath it.
    if (!noBtn.classList.contains("is-loose")) {
      field.style.minHeight = field.offsetHeight + "px";
      noBtn.classList.add("is-loose");
    }

    // Use layout sizes, not rects: both buttons animate their transform, so a
    // rect read mid-transition reports a stale size and we'd reserve too little.
    const fieldW = field.clientWidth;
    const fieldH = field.clientHeight;
    const noW = noBtn.offsetWidth;
    const noH = noBtn.offsetHeight;

    const maxX = Math.max(0, fieldW - noW);
    const maxY = Math.max(0, fieldH - noH);

    // Yes sits above No in the stacking order, so a spot underneath it is a
    // spot the button could never be chased out of again. Reserve the space Yes
    // will occupy at full size, then pick from the free bands around it.
    const gap = 8;
    const yesCX = yesBtn.offsetLeft + yesBtn.offsetWidth / 2;
    const yesCY = yesBtn.offsetTop + yesBtn.offsetHeight / 2;

    function bandsFor(scale) {
      const halfW = (yesBtn.offsetWidth  * scale) / 2;
      const halfH = (yesBtn.offsetHeight * scale) / 2;
      const left  = yesCX - halfW - noW - gap;
      const right = yesCX + halfW + gap;
      const above = yesCY - halfH - noH - gap;
      const below = yesCY + halfH + gap;

      const out = [];
      if (left  >  0)    out.push([0,     left,  0,     maxY]);   // left of Yes
      if (right <  maxX) out.push([right, maxX,  0,     maxY]);   // right of Yes
      if (above >  0)    out.push([0,     maxX,  0,     above]);  // above Yes
      if (below <  maxY) out.push([0,     maxX,  below, maxY]);   // below Yes
      return out;
    }

    // Prefer a spot that stays clear even once Yes reaches full size; if the
    // field is too cramped for that, settle for clear of Yes as it is today.
    let bands = bandsFor(MAX_YES_SCALE);
    if (!bands.length) bands = bandsFor(yesScale());

    const curX = noBtn.offsetLeft;
    const curY = noBtn.offsetTop;

    if (!bands.length) {
      // Yes has eaten the whole field. The corners are always the roomiest
      // spots left, so take whichever one it is furthest from.
      const corners = [[0, 0], [maxX, 0], [0, maxY], [maxX, maxY]];
      let far = corners[0], farDist = -1;
      corners.forEach(([cx, cy]) => {
        const dist = Math.hypot(cx + noW / 2 - yesCX, cy + noH / 2 - yesCY);
        if (dist > farDist) { farDist = dist; far = [cx, cy]; }
      });
      noBtn.style.left = far[0] + "px";
      noBtn.style.top  = far[1] + "px";
      return;
    }

    // Out of a few candidates, take the one furthest from where it sits now,
    // so every dodge reads as a real jump rather than a twitch.
    let best = null, bestDist = -1;
    for (let i = 0; i < 8; i++) {
      const [x0, x1, y0, y1] = bands[Math.floor(Math.random() * bands.length)];
      const x = x0 + Math.random() * Math.max(0, x1 - x0);
      const y = y0 + Math.random() * Math.max(0, y1 - y0);
      const dist = Math.hypot(x - curX, y - curY);
      if (dist > bestDist) { bestDist = dist; best = [x, y]; }
    }

    noBtn.style.left = best[0] + "px";
    noBtn.style.top  = best[1] + "px";
  }

  function escalate() {
    if (surrendered) return;

    attempts++;

    noBtn.textContent  = NO_LABELS[Math.min(attempts, NO_LABELS.length - 1)];
    yesBtn.textContent = YES_LABELS[Math.min(attempts, YES_LABELS.length - 1)];
    bubble.textContent = BUBBLES[Math.min(attempts, BUBBLES.length - 1)];

    // Yes grows, No shrinks.
    yesBtn.style.transform = "scale(" + yesScale() + ")";
    if (attempts >= 3) noBtn.classList.add("is-tiny");

    if (attempts >= 2) {
      sprite.src = "assets/sad.gif";
      sprite.alt = "A pixel-art Spider-Man mask looking sad";
    }

    if (attempts >= NO_LABELS.length - 1) surrender();
  }

  // Both buttons say yes now. The joke has landed.
  function surrender() {
    surrendered = true;
    noBtn.classList.remove("is-loose", "is-tiny", "btn-no");
    noBtn.classList.add("btn-yes");
    noBtn.style.left = "";
    noBtn.style.top = "";
    noBtn.textContent = "DEFINITELY YES";
    noBtn.blur();

    // Hand the field back to the normal flex flow, and drop Yes back to a
    // sane size — a 1.75x button would sit on top of its new twin.
    yesBtn.style.transform = "scale(1)";
    field.style.minHeight = "";
    field.classList.add("is-settled");

    $("#askHint").textContent = "(told you)";
  }

  function sayYes() {
    confetti(90);
    show("screen-yay");
    setTimeout(() => confetti(40), 600);
  }

  function wireAsk() {
    yesBtn.addEventListener("click", sayYes);

    noBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (surrendered) { sayYes(); return; }
      escalate();
      dodge();
      $("#askSprite").classList.add("shake");
      setTimeout(() => $("#askSprite").classList.remove("shake"), 620);
    });

    if (CAN_HOVER) {
      noBtn.addEventListener("pointerenter", () => {
        const now = Date.now();
        if (now - lastDodge < 220) return;   // don't spin out on a fast sweep
        lastDodge = now;
        dodge();
        escalate();
      });
    }

    // Keep it inside the panel if the window changes size mid-chase.
    window.addEventListener("resize", () => {
      if (noBtn.classList.contains("is-loose")) dodge();
    });
  }

  /* ---------------------------------------------------------- calendar */

  const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
                  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const DAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let viewY = today.getFullYear();
  let viewM = today.getMonth();

  const iso = (y, m, d) =>
    y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");

  function renderCalendar() {
    const grid = $("#calGrid");
    grid.textContent = "";
    $("#calLabel").textContent = MONTHS[viewM] + " " + viewY;

    // Monday-first offset.
    const first = new Date(viewY, viewM, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-cell is-empty";
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.textContent = d;

      const cellDate = new Date(viewY, viewM, d);
      const value = iso(viewY, viewM, d);

      if (cellDate < today) cell.disabled = true;
      if (cellDate.getTime() === today.getTime()) cell.classList.add("is-today");
      if (state.date === value) cell.classList.add("is-picked");

      cell.setAttribute("aria-label", d + " " + MONTHS[viewM] + " " + viewY);
      cell.addEventListener("click", () => {
        state.date = value;
        save();
        renderCalendar();
        updatePlanNav();
        $("#dateHint").textContent = "locked in: " + prettyDate(value);
      });

      grid.appendChild(cell);
    }

    // Never let them wander into the past.
    $("#prevMonth").disabled =
      viewY === today.getFullYear() && viewM === today.getMonth();
  }

  function prettyDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return DAYS_SHORT[dt.getDay()] + " " + d + " " + MONTHS[m - 1].slice(0, 3) + " " + y;
  }

  function shiftMonth(delta) {
    viewM += delta;
    if (viewM < 0)   { viewM = 11; viewY--; }
    if (viewM > 11)  { viewM = 0;  viewY++; }
    renderCalendar();
  }

  /* ---------------------------------------------------------- plan wizard */

  let planStep = 1;

  function showPlanStep(n) {
    planStep = n;
    $$(".substep").forEach(el => el.classList.remove("is-active"));
    $(["#step-date", "#step-time", "#step-place"][n - 1]).classList.add("is-active");

    $$(".step").forEach(el => {
      const s = Number(el.dataset.step);
      el.classList.toggle("is-on", s === n);
      el.classList.toggle("is-done", s < n);
    });

    $("#planNext").textContent = n === 3 ? "NEXT: SNACKS >" : "NEXT >";
    updatePlanNav();
  }

  function updatePlanNav() {
    const ready = [null, !!state.date, !!state.time, !!state.place][planStep];
    $("#planNext").disabled = !ready;
  }

  function pickChip(container, value, key) {
    $$(".chip", container).forEach(c =>
      c.classList.toggle("is-on", c.dataset[key] === value));
  }

  function wirePlan() {
    $("#prevMonth").addEventListener("click", () => shiftMonth(-1));
    $("#nextMonth").addEventListener("click", () => shiftMonth(1));

    $("#timeChips").addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if (!chip) return;
      state.time = chip.dataset.time;
      $("#customTime").value = "";
      pickChip($("#timeChips"), state.time, "time");
      save();
      updatePlanNav();
    });

    $("#customTime").addEventListener("input", (ev) => {
      state.time = ev.target.value || null;
      pickChip($("#timeChips"), null, "time");
      save();
      updatePlanNav();
    });

    $("#placeChips").addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if (!chip) return;
      state.place = chip.dataset.place;
      $("#customPlace").value = "";
      pickChip($("#placeChips"), state.place, "place");
      save();
      updatePlanNav();
    });

    $("#customPlace").addEventListener("input", (ev) => {
      state.place = ev.target.value.trim() || null;
      pickChip($("#placeChips"), null, "place");
      save();
      updatePlanNav();
    });

    $("#planNext").addEventListener("click", () => {
      if (planStep < 3) showPlanStep(planStep + 1);
      else { renderFood(); show("screen-food"); }
    });

    $("#planBack").addEventListener("click", () => {
      if (planStep > 1) showPlanStep(planStep - 1);
      else show("screen-yay");
    });
  }

  /* ---------------------------------------------------------- food */

  const FOODS = [
    { id: "popcorn",  label: "POPCORN",   img: "assets/popcorn.gif" },
    { id: "pizza",    label: "PIZZA",     img: "assets/food/pizza.png" },
    { id: "burger",   label: "BURGERS",   img: "assets/food/burger.png" },
    { id: "sushi",    label: "SUSHI",     img: "assets/food/sushi.png" },
    { id: "ramen",    label: "RAMEN",     img: "assets/food/ramen.png" },
    { id: "tacos",    label: "TACOS",     img: "assets/food/tacos.png" },
    { id: "nachos",   label: "NACHOS",    img: "assets/food/nachos.png" },
    { id: "icecream", label: "ICE CREAM", img: "assets/food/icecream.png" },
    { id: "boba",     label: "BOBA",      img: "assets/food/boba.png" }
  ];

  function renderFood() {
    const grid = $("#foodGrid");
    if (grid.childElementCount) return;   // build once

    FOODS.forEach(food => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "food";
      btn.setAttribute("aria-pressed", "false");

      const img = document.createElement("img");
      img.src = food.img;
      img.alt = "";
      const span = document.createElement("span");
      span.textContent = food.label;

      btn.append(img, span);
      btn.addEventListener("click", () => {
        const i = state.foods.indexOf(food.label);
        if (i === -1) state.foods.push(food.label);
        else state.foods.splice(i, 1);
        const on = i === -1;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
        save();
      });

      if (state.foods.includes(food.label)) {
        btn.classList.add("is-on");
        btn.setAttribute("aria-pressed", "true");
      }
      grid.appendChild(btn);
    });
  }

  function wireFood() {
    $("#customFood").addEventListener("input", (ev) => {
      state.customFood = ev.target.value.trim();
      save();
    });
    $("#foodBack").addEventListener("click", () => { show("screen-plan"); showPlanStep(3); });
    $("#foodNext").addEventListener("click", () => {
      renderTicket();
      show("screen-ticket");
      confetti(60);
    });
  }

  function foodSummary() {
    const all = state.foods.slice();
    if (state.customFood) all.push(state.customFood);
    if (!all.length) return "dealer's choice";
    return all.join(" + ");
  }

  /* ---------------------------------------------------------- ticket */

  function renderTicket() {
    $("#tkFor").textContent   = state.to;
    $("#tkDay").textContent   = state.date ? prettyDate(state.date) : "—";
    $("#tkTime").textContent  = state.time || "—";
    $("#tkPlace").textContent = state.place || "—";
    $("#tkFood").textContent  = foodSummary();
  }

  function planText() {
    return [
      "IT'S OFFICIAL — we're seeing the new Spider-Man.",
      "",
      "DAY:    " + (state.date ? prettyDate(state.date) : "—"),
      "TIME:   " + (state.time || "—"),
      "PLACE:  " + (state.place || "—"),
      "SNACKS: " + foodSummary()
    ].join("\n");
  }

  // A link that reopens this page straight on the finished ticket.
  function planLink() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    const p = url.searchParams;
    if (state.to && state.to !== "you") p.set("to", state.to);
    if (state.date) p.set("d", state.date);
    if (state.time) p.set("t", state.time);
    if (state.place) p.set("p", state.place);
    const foods = state.foods.slice();
    if (state.customFood) foods.push(state.customFood);
    if (foods.length) p.set("f", foods.join("|"));
    p.set("done", "1");
    return url.toString();
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.textContent = ""; }, 4000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Clipboard API needs a secure context; fall back to the old way.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  /* ---------------------------------------------------------- .ics */

  const icsEscape = (s) =>
    String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
             .replace(/,/g, "\\,").replace(/\n/g, "\\n");

  function stamp(dt) {
    const p = (n) => String(n).padStart(2, "0");
    return dt.getFullYear() + p(dt.getMonth() + 1) + p(dt.getDate()) +
           "T" + p(dt.getHours()) + p(dt.getMinutes()) + "00";
  }

  function downloadIcs() {
    if (!state.date || !state.time) {
      toast("pick a day and a time first!");
      return;
    }

    const [y, m, d] = state.date.split("-").map(Number);
    const [hh, mm]  = state.time.split(":").map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    const end   = new Date(start.getTime() + 150 * 60 * 1000);  // film + snacks

    // Floating local time — no timezone conversion surprises.
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//spidey-invite//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "-spidey@invite",
      "DTSTAMP:" + stamp(new Date()) + "Z",
      "DTSTART:" + stamp(start),
      "DTEND:" + stamp(end),
      "SUMMARY:" + icsEscape("Spider-Man movie date"),
      "LOCATION:" + icsEscape(state.place || "TBC"),
      "DESCRIPTION:" + icsEscape("Snacks: " + foodSummary()),
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spider-man-date.ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("calendar file saved");
  }

  function wireTicket() {
    $("#shareBtn").addEventListener("click", async () => {
      const text = planText();
      const url = planLink();

      if (navigator.share) {
        try {
          await navigator.share({ title: "Our Spider-Man date", text, url });
          return;
        } catch (e) {
          if (e && e.name === "AbortError") return;   // they closed the sheet
        }
      }
      const ok = await copyText(text + "\n\n" + url);
      toast(ok ? "copied! now paste it to me" : "couldn't copy — screenshot it instead");
    });

    $("#icsBtn").addEventListener("click", downloadIcs);

    $("#restartBtn").addEventListener("click", () => {
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      const url = new URL(window.location.href);
      url.search = state.to && state.to !== "you"
        ? "?to=" + encodeURIComponent(state.to) : "";
      window.location.href = url.toString();
    });
  }

  /* ---------------------------------------------------------- params */

  const clean = (s, max) => String(s).replace(/\s+/g, " ").trim().slice(0, max);

  function readParams() {
    const p = new URLSearchParams(window.location.search);

    if (p.get("to")) {
      state.to = clean(p.get("to"), 24) || "you";
      $("#askTo").textContent = "TRANSMISSION FOR: " + state.to.toUpperCase();
    }

    if (p.get("done")) {
      if (p.get("d")) state.date = clean(p.get("d"), 10);
      if (p.get("t")) state.time = clean(p.get("t"), 5);
      if (p.get("p")) state.place = clean(p.get("p"), 60);
      if (p.get("f")) {
        state.foods = p.get("f").split("|").map(s => clean(s, 40)).filter(Boolean).slice(0, 12);
        state.customFood = "";
      }
      return true;
    }
    return false;
  }

  /* ---------------------------------------------------------- init */

  function init() {
    load();
    const straightToTicket = readParams();

    wireAsk();
    wirePlan();
    wireFood();
    wireTicket();

    renderCalendar();
    showPlanStep(1);

    // Restore anything they'd already chosen.
    if (state.time) pickChip($("#timeChips"), state.time, "time");
    if (state.place) pickChip($("#placeChips"), state.place, "place");
    if (state.customFood) $("#customFood").value = state.customFood;

    $("#startBtn").addEventListener("click", () => show("screen-ask"));
    $("#toPlanBtn").addEventListener("click", () => show("screen-plan"));

    if (straightToTicket) {
      renderFood();
      renderTicket();
      $("#ticketNote").textContent = "this is the plan. it is legally binding.";
      show("screen-ticket");
      confetti(60);
      return;
    }

    runBoot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
