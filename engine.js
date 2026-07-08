// THE LONG HELLO — engine.js
// No prose in here; all text lives in content.js.

"use strict";

// ------------------------------------------------------------- time / dev ---
const URLP = new URLSearchParams(location.search);
const DEV_MODE = URLP.has("dev");
const SCALE = DEV_MODE ? (parseFloat(URLP.get("dev")) || 6) : 1;

const rnow = () => performance.now();
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms / SCALE)));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------- storage ---
const Store = {
  ok: true,
  mem: {},
  probe() {
    try { localStorage.setItem("tlh_probe", "1"); localStorage.removeItem("tlh_probe"); }
    catch (e) { this.ok = false; }
  },
  get(k) {
    if (!this.ok) return this.mem[k];
    try { return localStorage.getItem(k); } catch (e) { return this.mem[k]; }
  },
  set(k, v) {
    this.mem[k] = v;
    if (!this.ok) return;
    try { localStorage.setItem(k, v); } catch (e) { /* cabinet forgets */ }
  },
  del(k) {
    delete this.mem[k];
    if (!this.ok) return;
    try { localStorage.removeItem(k); } catch (e) { /* ok */ }
  },
};
Store.probe();

const SAVE_KEY = "tlh_save";
const META_KEY = "tlh_meta";
const SAVE_V = 1;

function freshState() {
  return {
    v: SAVE_V,
    loopIndex: 0,
    phase: "ward",        // ward | walk | flat
    clockMin: 40,
    ease: TUNING.easeStart,
    weight: 0,
    presence_total: 0,
    presence_egg: 0,
    visits_egg: 0,
    touches_egg: 0,
    demands: 0,
    demandHistory: [],
    satPatients: {},
    secondMessage: false,
    scumTold: false,
    humHeard: false,
    deathTonight: false,
    griefPending: false,
    widowSeen: false,
    inscriptionRead: false,
    crocusSeen: false,
    attnSeen: false,
    hasHat: false,
    leftSomething: null,
    leftGoneTold: false,
    hatSillTold: false,
    stayUpUsed: false,
    strangerDone: false,
    filmDone: false,
    benchSeen: false,
    tickerOn: false,
    tickerNext: 0,
    chartIdx: 0,
  };
}

let state = freshState();
let hadSave = false;
(function loadState() {
  const raw = Store.get(SAVE_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s && s.v === SAVE_V) { state = Object.assign(freshState(), s); hadSave = true; }
  } catch (e) { /* fresh */ }
})();

let meta = { secondMessageSeen: false, titleStill: false };
(function loadMeta() {
  const raw = Store.get(META_KEY);
  if (!raw) return;
  try { meta = Object.assign(meta, JSON.parse(raw)); } catch (e) { /* fresh */ }
})();

let HALTED = false; // set by dev jumps so in-flight scene code can't clobber the save
function save(phase) {
  if (HALTED) return;
  if (phase) state.phase = phase;
  Store.set(SAVE_KEY, JSON.stringify(state));
}
function saveMeta() { Store.set(META_KEY, JSON.stringify(meta)); }

// -------------------------------------------------------------------- dom ---
const el = {
  log: document.getElementById("log"),
  verbs: document.getElementById("verbs"),
  hdL: document.getElementById("hd-left"),
  hdR: document.getElementById("hd-right"),
  ticker: document.getElementById("ticker"),
  tickerInner: document.querySelector("#ticker .inner"),
  devhud: document.getElementById("devhud"),
};

// ----------------------------------------------------------------- header ---
const HeaderState = { label: "" };
function fmtClock(min) {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}
function setHeader(label, showClock = true) {
  HeaderState.label = label;
  el.hdL.textContent = label;
  el.hdR.textContent = showClock ? fmtClock(state.clockMin) : "";
}
function refreshClock() { el.hdR.textContent = fmtClock(state.clockMin); }

function curLoop() { return LOOPS[Math.min(state.loopIndex, LOOPS.length - 1)]; }
function curNight() { return curLoop().n; }
function isSeason(L) { return L.n >= 75; }
function actKey(L) { return L.n >= 75 ? "act3" : (L.n >= 15 ? "act2" : "act1"); }
function wardLabel(L) { return isSeason(L) ? L.label : L.label; }
function morningLabel(L) { return isSeason(L) ? L.label : "MORNING"; }

// -------------------------------------------------------------------- log ---
const CLOCK = { perLine: 3 }; // minutes added per printed line

function appendLine(text, cls) {
  const div = document.createElement("div");
  div.className = "line" + (cls ? " " + cls : "");
  div.textContent = text === "" ? " " : text;
  el.log.appendChild(div);
  const kids = el.log.children;
  for (let i = 0; i < kids.length - 6; i++) kids[i].classList.add("dim");
  el.log.scrollTop = el.log.scrollHeight;
  return div;
}

const Log = {
  queue: [],
  busy: false,
  skipping: false,
  curCeremonial: false,
  print(text, opts = {}) {
    return new Promise(res => {
      this.queue.push({ text, opts, res });
      this.pump();
    });
  },
  async pump() {
    if (this.busy) return;
    this.busy = true;
    while (this.queue.length) {
      const { text, opts, res } = this.queue.shift();
      this.curCeremonial = !!opts.ceremonial;
      appendLine(text, opts.cls);
      state.clockMin += opts.clock != null ? opts.clock : CLOCK.perLine;
      refreshClock();
      const base = opts.delay != null ? opts.delay
        : Math.min(TUNING.lineDelayBase + text.length * TUNING.lineDelayPerChar, TUNING.lineDelayMax);
      await sleep(this.skipping && !opts.ceremonial ? 60 : base);
      res();
    }
    this.busy = false;
    this.skipping = false;
    this.curCeremonial = false;
  },
  hasCeremonial() {
    return this.curCeremonial || this.queue.some(i => i.opts.ceremonial);
  },
};

async function say(lines, opts) {
  for (const line of lines) await Log.print(line, opts);
}
async function ceremony(lines, opts = {}) {
  for (const line of lines) {
    await Log.print(line, Object.assign({ ceremonial: true, delay: TUNING.ceremonyDelay }, opts));
  }
}

// ------------------------------------------------------------------ input ---
let lastInputAt = rnow();
const INPUT = { locked: false };
const session = { noHurry: false };

function maybeNoHurry() {
  if (session.noHurry) return;
  session.noHurry = true;
  appendLine(TITLE.noHurry, "faint");
}

// ----------------------------------------------------------------- verbs ---
const Choice = { active: null };

function renderVerbs() {
  const c = Choice.active;
  el.verbs.innerHTML = "";
  if (!c) return;
  c.options.forEach((o, i) => {
    const div = document.createElement("div");
    div.className = "verb" + (i === c.sel ? " sel" : "");
    div.textContent = (i === c.sel ? "> " : "  ") + o.label;
    div.addEventListener("click", () => resolveChoice(i));
    el.verbs.appendChild(div);
  });
}

function choose(options) {
  return new Promise(res => {
    Choice.active = { options, sel: 0, res };
    renderVerbs();
  });
}

function resolveChoice(i) {
  const c = Choice.active;
  if (!c || i < 0 || i >= c.options.length) return;
  Choice.active = null;
  el.verbs.innerHTML = "";
  c.res(c.options[i].id != null ? c.options[i].id : i);
}

function clearVerbs() {
  Choice.active = null;
  el.verbs.innerHTML = "";
}

// typed input (leave something — "write something")
function typedLine() {
  return new Promise(res => {
    el.verbs.innerHTML = "";
    const input = document.createElement("input");
    input.maxLength = 60;
    input.autofocus = true;
    el.verbs.appendChild(input);
    input.focus();
    input.addEventListener("keydown", e => {
      e.stopPropagation();
      lastInputAt = rnow();
      if (e.key === "Enter") {
        const v = input.value.trim();
        el.verbs.innerHTML = "";
        res(v);
      }
    });
  });
}

// ------------------------------------------------------------------ ticker ---
const Ticker = {
  timer: null,
  start(initialText) {
    state.tickerOn = true;
    el.ticker.classList.add("on");
    if (initialText != null) this.set(initialText);
    if (!this.timer) {
      this.timer = setInterval(() => this.update(), TUNING.tickerPeriodMs / SCALE);
    }
  },
  set(text) {
    el.tickerInner.style.animation = "none";
    // force reflow so the marquee restarts
    void el.tickerInner.offsetWidth;
    el.tickerInner.textContent = text;
    if (text) {
      const dur = Math.max(18, text.length * 0.4) / Math.min(SCALE, 4);
      el.tickerInner.style.animation = `marquee ${dur}s linear infinite`;
    }
  },
  update() {
    if (!state.tickerOn) return;
    const night = curNight();
    if (state.tickerNext < TICKER.length && TICKER[state.tickerNext].n <= night) {
      this.set(TICKER[state.tickerNext].t);
      state.tickerNext++;
      return;
    }
    if (night >= 75) {
      // act III: new lines linger on season change; past the silence point, blank.
      if (night > TICKER_SILENT_AFTER) this.set("");
      return;
    }
    if (state.tickerNext > 0) {
      const lo = Math.max(0, state.tickerNext - 8);
      this.set(TICKER[lo + Math.floor(Math.random() * (state.tickerNext - lo))].t);
    }
  },
};

// ------------------------------------------------------------------- audio ---
const Hum = {
  ctx: null, osc: null, gain: null, playing: false,
  userGesture() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  start() {
    if (this.playing) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.osc = this.ctx.createOscillator();
      this.osc.type = "sine";
      this.osc.frequency.value = 68;
      this.gain = this.ctx.createGain();
      this.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.022, this.ctx.currentTime + 4);
      this.osc.connect(this.gain).connect(this.ctx.destination);
      this.osc.start();
      this.playing = true;
    } catch (e) { /* no sound is fine */ }
  },
  stop() {
    if (!this.playing) return;
    try {
      const g = this.gain, o = this.osc, t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      o.stop(t + 1.6);
    } catch (e) { /* ok */ }
    this.playing = false;
  },
};

// --------------------------------------------------------------- presence ---
const SIT = { active: null };
const ParkVisit = { demands: 0, circles: 0, stillSec: 0 };

function addPresence(vSec, isPark) {
  const amt = TUNING.presencePerSec * vSec;
  state.presence_total += amt;
  if (isPark) state.presence_egg += amt;
}

function satCount() { return Object.keys(state.satPatients).length; }

function lastVisitsClean() {
  if (state.visits_egg < TUNING.msgVisitsEgg) return false;
  const prior = state.demandHistory.slice(-(TUNING.msgCleanVisits - 1));
  if (prior.length < TUNING.msgCleanVisits - 1) return false;
  return prior.every(d => d === 0) && ParkVisit.demands === 0;
}

function msgReady() {
  return !state.secondMessage
    && state.presence_egg >= TUNING.msgPresenceEgg
    && state.visits_egg >= TUNING.msgVisitsEgg
    && satCount() >= TUNING.msgPatientsSat
    && lastVisitsClean();
}

// fires the second message (or the save-scum line). returns "message"|"scum"|null
async function fireMessage() {
  if (!msgReady()) return null;
  if (meta.secondMessageSeen) {
    if (state.scumTold) return null;
    state.scumTold = true;
    state.secondMessage = true; // they know what it said
    save();
    await Log.print(PARK.scum, { ceremonial: true, delay: TUNING.ceremonyDelay });
    return "scum";
  }
  meta.secondMessageSeen = true;
  saveMeta();
  state.secondMessage = true;
  save();
  INPUT.locked = true;
  for (let i = 0; i < PARK.secondMessage.length; i++) {
    const frost = i >= PARK.secondMessageFrostFrom && i <= PARK.secondMessageFrostTo;
    await Log.print(PARK.secondMessage[i], {
      cls: frost ? "frost" : "", ceremonial: true, delay: TUNING.ceremonyDelay,
    });
  }
  INPUT.locked = false;
  return "message";
}

function sitKey() {
  const S = SIT.active;
  if (!S || S.ceremonyLock) return false;
  const wasAccruing = S.unbroken > 0.5;
  S.unbroken = 0;
  let created = false;
  if (!S.upShown) {
    S.upShown = true;
    created = true;
    Choice.active = {
      options: [{ id: "up", label: S.place === "park" ? PARK.getUp : WARD_GET_UP }],
      sel: 0,
      res: () => S.finish("up"),
    };
    renderVerbs();
  }
  if (wasAccruing && rnow() - S.lastDeflect > 2600 / SCALE) {
    S.lastDeflect = rnow();
    let line = pick(S.deflections);
    line = line.replace("{pn}", (PATIENTS[S.patient] || { pn: "he" }).pn);
    appendLine(line, "faint");
  }
  return created;
}

function runSit(opts) {
  // opts: { place, patient?, capSec, deflections }
  return new Promise(resolve => {
    clearVerbs();
    const S = {
      place: opts.place,
      patient: opts.patient,
      capSec: opts.capSec,
      deflections: opts.deflections,
      accrued: 0,
      unbroken: 0,
      counted: false,
      upShown: false,
      lastDeflect: 0,
      ceremonyLock: false,
      lastT: rnow(),
      done: false,
      raf: 0,
      finish(reason) {
        if (S.done) return;
        S.done = true;
        SIT.active = null;
        clearVerbs();
        cancelAnimationFrame(S.raf);
        if (S.place === "park") Hum.stop();
        resolve(reason);
      },
    };
    SIT.active = S;

    const tick = () => {
      if (S.done) return;
      const t = rnow();
      const v = ((t - S.lastT) / 1000) * SCALE;
      S.lastT = t;
      if (!S.ceremonyLock) {
        const still = (t - lastInputAt) > TUNING.stillMs / SCALE
          && document.visibilityState === "visible";
        if (still && v > 0 && v < 5) {
          S.accrued += v;
          S.unbroken += v;
          addPresence(v, S.place === "park");
          state.clockMin += v * 0.5;
          refreshClock();
          if (S.place === "park") {
            if (state.humHeard) Hum.start();
            // the hum, discovered
            if (!state.humHeard
              && curNight() >= TUNING.humNight
              && state.presence_egg >= TUNING.humPresenceEgg
              && S.unbroken >= TUNING.humUnbrokenSec) {
              state.humHeard = true;
              save();
              ceremony(PARK.hum, { cls: "frost" });
              Hum.start();
            }
            // the second message
            if (S.unbroken >= TUNING.msgUnbrokenSec && msgReady() && !state.scumTold) {
              S.ceremonyLock = true;
              fireMessage().then(r => S.finish(r === "message" ? "message" : "up"));
            }
          } else if (!S.counted && S.patient
            && S.accrued >= TUNING.wardSitCountsAt / TUNING.presencePerSec) {
            S.counted = true;
            state.satPatients[S.patient] = true;
            save();
          }
          if (!S.ceremonyLock && S.accrued >= S.capSec) {
            S.finish("cap");
            return;
          }
        }
      }
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  });
}

// ------------------------------------------------------------------- ward ---
async function runChoice(choiceDef) {
  const idx = await choose(choiceDef.options.map((o, i) => ({ id: i, label: o.label })));
  const opt = choiceDef.options[idx];
  await say(opt.say);
  if (opt.ease) state.ease = Math.min(100, state.ease + opt.ease);
  return opt;
}

async function runScriptedSit(menu) {
  INPUT.locked = true;
  clearVerbs();
  for (const line of SCRIPTED_SITS[menu.scripted]) {
    await Log.print(line, { ceremonial: true, delay: TUNING.scriptedSitDelay });
  }
  INPUT.locked = false;
  state.satPatients[menu.patient] = true;
  state.presence_total += 5;
  save();
}

async function runWardMenu(L, m) {
  if (m.noSit) {
    let charted = 0;
    while (true) {
      const opts = [];
      if (charted < 2) opts.push({ id: "charts", label: WARD_CHARTS });
      opts.push({ id: "finish", label: WARD_FINISH });
      const p = await choose(opts);
      if (p === "charts") {
        await say([CHART_LINES[state.chartIdx++ % CHART_LINES.length]]);
        charted++;
      } else return;
    }
  }
  let charted = 0;
  let sat = false;
  while (true) {
    const opts = [{ id: "sit", label: m.sitLabel }];
    if (charted < 2) opts.push({ id: "charts", label: WARD_CHARTS });
    if (!m.mustSit || sat) opts.push({ id: "finish", label: WARD_FINISH });
    const p = await choose(opts);
    if (p === "charts") {
      await say([CHART_LINES[state.chartIdx++ % CHART_LINES.length]]);
      charted++;
      continue;
    }
    if (p === "sit") {
      sat = true;
      if (m.scripted) {
        await runScriptedSit(m);
      } else {
        if (m.pre) await say(m.pre);
        const r = await runSit({
          place: "ward", patient: m.patient,
          capSec: TUNING.wardSitCapSec, deflections: WARD_DEFLECTIONS,
        });
        if (r === "cap") await say([WARD_SIT_END]);
      }
      if (m.post) await say(m.post);
      return;
    }
    if (p === "finish") return;
  }
}

async function runWard(L) {
  state.clockMin = 40 + Math.floor(rand(0, 40));
  CLOCK.perLine = 9;
  setHeader(wardLabel(L));
  if (state.tickerOn) Ticker.update();
  const steps = WARD[L.id] || [];
  for (const step of steps) {
    if (step.say) {
      await say(step.say);
      if (step.death) {
        state.weight++;
        state.deathTonight = true;
        state.griefPending = true;
      }
      if (step.give === "hat") state.hasHat = true;
    } else if (step.choice) {
      await runChoice(step.choice);
    } else if (step.menu) {
      await runWardMenu(L, step.menu);
    }
  }
  CLOCK.perLine = 3;
  state.clockMin = 6 * 60 + 2;
  await Log.print(WARD_END, { delay: 1500 });
}

// ------------------------------------------------------------------- walk ---
async function runArrival() {
  await Log.print(WALK.arrival.open, { delay: 1600 });
  await Log.print(WALK.arrival.something, { delay: 2600, ceremonial: true });
  await Log.print(WALK.arrival.egg.join("\n"), { cls: "art", ceremonial: true, delay: 4000 });
  await say(WALK.arrival.after, { delay: 1700 });
  Ticker.start(WALK.arrival.tickerLine);
  save();
  await sleep(2200);
  await say(WALK.arrival.close, { delay: 2000 });
}

async function runWalk(L) {
  state.clockMin = 6 * 60 + 8;
  setHeader(morningLabel(L));
  if (state.tickerOn) Ticker.update();
  if (L.id === 3) {
    await runArrival();
    return { park: false, silentNight: true };
  }
  let lines = WALK.default;
  if (state.deathTonight) lines = WALK.grief;
  else if (RAIN_NIGHTS[L.id]) lines = WALK.rain;
  else if (actKey(L) !== "act1") lines = WALK.short;
  await say(lines);
  if (L.n < 4) return { park: false };
  const c = await choose([
    { id: "stop", label: "stop at the park" },
    { id: "walk", label: "keep walking" },
  ]);
  if (c === "stop") return { park: true };
  await Log.print(WALK.keepWalking);
  return { park: false };
}

// ------------------------------------------------------------------- park ---
function parkAmbient(L) {
  const n = L.n;
  if (isSeason(L)) return PARK.ambient[L.id] || PARK.ambient.au3;
  if (n <= 6) return PARK.ambient.crowds;
  if (n <= 14) return PARK.ambient.thinning;
  return PARK.ambient.regulars;
}

function parkVerbs(L) {
  const n = L.n;
  const v = [];
  v.push({ id: "look", label: PARK.verbs.look });
  v.push({ id: "circle", label: PARK.verbs.circle });
  if (n >= 5) v.push({ id: "touch", label: PARK.verbs.touch });
  if (n >= 8 && !isSeason(L)) v.push({ id: "ask", label: PARK.verbs.ask });
  if (n >= 6) v.push({ id: "sit", label: PARK.verbs.sit });
  if (state.widowSeen && !state.leftSomething && n >= 25) {
    v.push({ id: "leave", label: PARK.verbs.leave });
  }
  v.push({ id: "home", label: PARK.home });
  return v;
}

async function doCircle(L) {
  ParkVisit.circles++;
  if (!state.inscriptionRead) {
    state.inscriptionRead = true;
    await say(PARK.circleFirst);
    await ceremony(PARK.inscription, { cls: "frost" });
    await say(PARK.circleFirstEnd);
    save();
    return;
  }
  if (L.id === "wi1" && !state.crocusSeen && ParkVisit.circles >= 2) {
    state.crocusSeen = true;
    save();
    await say(PARK.circleCrocus, { delay: 1600 });
    return;
  }
  await say(PARK.circleAgain);
}

async function doTouch(L) {
  state.touches_egg++;
  await Log.print(Math.random() < 0.1 ? PARK.touchWarm : PARK.touch, { delay: 1400 });
  if (RAIN_NIGHTS[L.id]) await Log.print(PARK.touchRain, { delay: 1600 });
  if (L.n >= 30 && (!state.attnSeen || Math.random() < 0.3)) {
    state.attnSeen = true;
    await Log.print(PARK.touchAttention, { delay: 1800 });
  }
  return fireMessage(); // "message" | "scum" | null
}

async function doAsk() {
  state.demands++;
  ParkVisit.demands++;
  const variant = PARK.ask[(state.demands - 1) % PARK.ask.length];
  await say(variant, { delay: 1600 });
}

async function doLeave() {
  const opts = PARK.leaveOptions
    .filter(o => !o.needsFlag || state[o.needsFlag])
    .map(o => ({ id: o.id, label: o.label }));
  await Log.print(PARK.leaveIntro);
  const id = await choose(opts);
  const opt = PARK.leaveOptions.find(o => o.id === id);
  if (id === "write") {
    await say(opt.say);
    const text = await typedLine();
    if (!text) return; // the thought went unwritten; the verb stays
    state.leftSomething = { id, text };
    await say(opt.after, { delay: 1600 });
  } else {
    state.leftSomething = { id };
    await say(opt.say, { delay: 1500 });
  }
  save();
}

async function runPark(L) {
  ParkVisit.demands = 0;
  ParkVisit.circles = 0;
  ParkVisit.stillSec = 0;
  state.visits_egg++;
  state.clockMin = 6 * 60 + 20;
  setHeader(morningLabel(L));
  await say(parkAmbient(L), { delay: 1300 });
  if (L.n >= 6 && !state.benchSeen) {
    state.benchSeen = true;
    await Log.print(PARK.benchArrives, { delay: 1500 });
  }
  if (state.griefPending) {
    state.griefPending = false;
    state.touches_egg++;
    state.presence_egg += 5;
    state.presence_total += 5;
    await say(PARK.grief, { delay: 2200 });
    save();
  }
  if (L.n >= 25 && !state.widowSeen && !isSeason(L)) {
    state.widowSeen = true;
    await say(PARK.widow, { delay: 2000 });
    const idx = await choose(PARK.widowChoice.map((o, i) => ({ id: i, label: o.label })));
    const opt = PARK.widowChoice[idx];
    await say(opt.say);
    if (opt.ease) state.ease = Math.min(100, state.ease + opt.ease);
    save();
  }
  if (L.id === "au2" && state.leftSomething && !state.leftGoneTold) {
    state.leftGoneTold = true;
    await say(PARK.leaveGone, { delay: 2000 });
  }
  if (L.id === 4 && !state.filmDone) {
    state.filmDone = true;
    await say(PARK.film);
    const idx = await choose(PARK.filmChoice.map((o, i) => ({ id: i, label: o.label })));
    const opt = PARK.filmChoice[idx];
    await say(opt.say);
    if (opt.ease) state.ease = Math.min(100, state.ease + opt.ease);
  }
  if (L.id === 5 && !state.strangerDone) {
    state.strangerDone = true;
    await say(PARK.stranger);
    const idx = await choose(PARK.strangerChoice.map((o, i) => ({ id: i, label: o.label })));
    const opt = PARK.strangerChoice[idx];
    await say(opt.say);
    if (opt.ease) state.ease = Math.min(100, state.ease + opt.ease);
  }

  let outcome = null;
  while (true) {
    const p = await choose(parkVerbs(L));
    state.clockMin += 4;
    refreshClock();
    if (p === "home") break;
    if (p === "look") { await say([PARK.look], { delay: 1500 }); continue; }
    if (p === "circle") { await doCircle(L); continue; }
    if (p === "ask") { await doAsk(); continue; }
    if (p === "leave") { await doLeave(); continue; }
    if (p === "touch") {
      const r = await doTouch(L);
      if (r === "message") { outcome = "message"; break; }
      continue;
    }
    if (p === "sit") {
      const remaining = TUNING.parkSitCapSec - ParkVisit.stillSec;
      if (remaining <= 5) {
        await Log.print(PARK.sitCapAgain, { delay: 1500 });
        continue;
      }
      await Log.print(PARK.sitDown, { delay: 1200 });
      const before = state.presence_egg;
      const r = await runSit({
        place: "park", capSec: remaining, deflections: PARK_DEFLECTIONS,
      });
      ParkVisit.stillSec += (state.presence_egg - before) / TUNING.presencePerSec;
      if (r === "cap") await Log.print(PARK.sitCap, { delay: 1600 });
      if (r === "message") { outcome = "message"; break; }
      continue;
    }
  }
  state.demandHistory.push(ParkVisit.demands);
  if (state.demandHistory.length > 12) state.demandHistory.shift();
  if (outcome === "message") await Log.print(PARK.afterMessage, { delay: 2200 });
  save();
  return outcome;
}

// ------------------------------------------------------------------- flat ---
async function runDusk() {
  setHeader("DUSK");
  state.clockMin = 18 * 60 + 40;
  await say(PARK.dusk, { delay: 2000 });
  state.touches_egg++;
  save();
}

async function runFlat(L, opts = {}) {
  state.clockMin = 7 * 60 + 5;
  setHeader(morningLabel(L));
  if (!opts.quiet) {
    const act = actKey(L);
    await say(state.deathTonight ? FLAT.heavy : FLAT[act]);
    if (L.id === "au2" && state.hasHat && (!state.leftSomething || state.leftSomething.id !== "hat")
      && !state.hatSillTold) {
      state.hatSillTold = true;
      await Log.print(PARK.hatWindowsill);
    }
    let looked = false;
    while (true) {
      const vs = [];
      if (!looked) vs.push({ id: "window", label: FLAT.lookOut });
      if (STAY_UP_NIGHTS[L.id] && !state.stayUpUsed && L.n >= 6) {
        vs.push({ id: "stayup", label: FLAT.stayUp });
      }
      vs.push({ id: "sleep", label: FLAT.sleep });
      const p = await choose(vs);
      if (p === "window") { looked = true; await say(FLAT.window[act]); continue; }
      if (p === "stayup") {
        state.stayUpUsed = true;
        await say(FLAT.stayUpLines);
        await runDusk();
        opts.silentSleep = true;
        break;
      }
      break;
    }
  }
  // sleep
  if (!opts.quiet && !opts.silentSleep) {
    await Log.print(FLAT.sleepLines[actKey(L)], { delay: 1800 });
  }
  const next = LOOPS[state.loopIndex + 1];
  if (next) {
    if (next.n > TUNING.easeDriftAfterNight) {
      state.ease = Math.min(100, state.ease + (next.n - L.n));
    }
    state.deathTonight = false;
    state.griefPending = false;
    if (next.gap) await Log.print(next.gap, { cls: "faint", delay: 2200 });
    state.loopIndex++;
    save("ward");
  }
}

// ----------------------------------------------------------------- ending ---
async function runEnding(L) {
  setHeader(L.label);
  Ticker.set("");
  state.clockMin = 40;
  const steps = WARD.sp4 || [];
  for (const step of steps) {
    if (step.say) await say(step.say, { delay: 1800 });
  }
  await Log.print(WARD_END, { delay: 2000 });
  state.clockMin = 6 * 60 + 8;
  await say(ENDING.walk, { delay: 2000 });
  state.clockMin = 6 * 60 + 20;
  await say(ENDING.park, { delay: 2000 });
  INPUT.locked = true;
  await ceremony(ENDING.sit);
  await Log.print(state.secondMessage ? ENDING.intimate : ENDING.distant,
    { ceremonial: true, delay: TUNING.ceremonyDelay + 1500 });
  await Log.print("", { ceremonial: true, delay: 2500 });
  await Log.print(ENDING.epilogue, { ceremonial: true, delay: TUNING.ceremonyDelay });
  if (meta.titleStill) {
    await Log.print(ENDING.titleCallback, { cls: "frost", ceremonial: true, delay: TUNING.ceremonyDelay });
  }
  INPUT.locked = false;
  await choose([{ id: "again", label: TITLE.again }]);
  Store.del(SAVE_KEY);
  location.reload();
}

// ------------------------------------------------------------------ title ---
async function runTitle() {
  setHeader("", false);
  appendLine("", "");
  appendLine(TITLE.name, "title-line");
  appendLine("", "");
  if (!Store.ok) appendLine(TITLE.cabinet, "faint");

  // doing nothing on the title screen is also noticed
  const noHurryLine = { shown: false };
  const watcher = setInterval(() => {
    if (noHurryLine.shown) return;
    if (rnow() - lastInputAt > TUNING.titleStillMs / SCALE) {
      noHurryLine.shown = true;
      appendLine(TITLE.noHurry, "faint");
      meta.titleStill = true;
      saveMeta();
    }
  }, 1000);

  const started = hadSave && (state.loopIndex > 0 || state.phase !== "ward");
  const opts = started
    ? [{ id: "resume", label: TITLE.resume }, { id: "again", label: TITLE.again }]
    : [{ id: "begin", label: TITLE.begin }];
  const p = await choose(opts);
  clearInterval(watcher);
  if (p === "again" || p === "begin") {
    state = freshState();
    save();
  }
  el.log.innerHTML = "";
}

// -------------------------------------------------------------------- dev ---
if (DEV_MODE) {
  el.devhud.style.display = "block";
  setInterval(() => {
    const S = SIT.active;
    el.devhud.textContent =
      `loop ${String(curLoop().id)} n${curNight()} ${state.phase}\n` +
      `egg ${state.presence_egg.toFixed(1)} total ${state.presence_total.toFixed(1)}\n` +
      `visits ${state.visits_egg} touches ${state.touches_egg} demands ${state.demands}\n` +
      `hist [${state.demandHistory.join(",")}] sat ${satCount()}\n` +
      `ease ${state.ease} hum ${state.humHeard} msg ${state.secondMessage}\n` +
      (S ? `SIT ${S.place} acc ${S.accrued.toFixed(1)} unb ${S.unbroken.toFixed(1)}` : "");
  }, 300);
  window.DEV = {
    state: () => state,
    meta: () => meta,
    set: (k, v) => { state[k] = v; save(); },
    grantMsg: () => {
      state.presence_egg = TUNING.msgPresenceEgg + 10;
      state.visits_egg = TUNING.msgVisitsEgg;
      state.demandHistory = [0, 0, 0, 0, 0];
      state.satPatients = { okafor: true, edith: true, marisol: true, dee: true };
      save();
    },
    goto: (id) => {
      const i = LOOPS.findIndex(l => String(l.id) === String(id));
      if (i < 0) return "no such loop";
      state.loopIndex = i;
      state.phase = "ward";
      Store.set(SAVE_KEY, JSON.stringify(state));
      HALTED = true;
      location.reload();
    },
    freshSave: () => { HALTED = true; Store.del(SAVE_KEY); location.reload(); },
    wipe: () => { HALTED = true; Store.del(SAVE_KEY); Store.del(META_KEY); location.reload(); },
  };
}

// ------------------------------------------------------------------ input ---
window.addEventListener("keydown", e => {
  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
    e.preventDefault();
  }
  lastInputAt = rnow();
  Hum.userGesture();
  if (INPUT.locked) {
    if (e.key === " ") maybeNoHurry();
    return;
  }
  if (SIT.active) {
    const created = sitKey();
    if (created) return; // the keypress that surfaced "get up" doesn't also select it
  }
  if (e.key === " ") {
    if (Log.busy) {
      if (Log.hasCeremonial()) maybeNoHurry();
      else Log.skipping = true;
    }
    return;
  }
  const c = Choice.active;
  if (!c) return;
  if (e.key === "ArrowUp") { c.sel = (c.sel + c.options.length - 1) % c.options.length; renderVerbs(); }
  else if (e.key === "ArrowDown") { c.sel = (c.sel + 1) % c.options.length; renderVerbs(); }
  else if (e.key === "Enter") resolveChoice(c.sel);
  else if (/^[1-9]$/.test(e.key)) {
    const i = Number(e.key) - 1;
    if (i < c.options.length) resolveChoice(i);
  }
});
window.addEventListener("pointerdown", () => {
  lastInputAt = rnow();
  Hum.userGesture();
  if (!INPUT.locked && SIT.active) sitKey();
});

// ------------------------------------------------------------------- main ---
async function main() {
  await runTitle();
  if (state.tickerOn) Ticker.start();
  while (state.loopIndex < LOOPS.length) {
    const L = LOOPS[state.loopIndex];
    if (L.id === "sp4") { await runEnding(L); return; }
    if (state.phase === "ward") {
      await runWard(L);
      save("walk");
    }
    if (state.phase === "walk") {
      const r = await runWalk(L);
      let quiet = !!r.silentNight;
      if (r.park) {
        const outcome = await runPark(L);
        if (outcome === "message") quiet = true;
      }
      save("flat");
      await runFlat(L, { quiet });
    } else {
      await runFlat(L);
    }
  }
}

main();
