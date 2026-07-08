// THE LONG HELLO — headless smoke test. Drives the real game at dev speed 40.
// needs: npm i playwright   then: node dev/smoke.mjs
import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8931;
const URL = `http://localhost:${PORT}/index.html?dev=40`;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const path = join(ROOT, req.url.split("?")[0]);
    const body = await readFile(path);
    res.writeHead(200, { "content-type": MIME[extname(path)] || "text/plain" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; console.log("  ok    " + name); }
  else { failed++; console.log("  FAIL  " + name); }
}

const logText = () => page.locator("#log").innerText();
const waitLine = (text, timeout = 20000) =>
  page.waitForFunction(
    t => document.getElementById("log").innerText.includes(t),
    text, { timeout }
  ).then(() => true).catch(() => false);
const waitVerb = (text, timeout = 20000) =>
  page.waitForFunction(
    t => [...document.querySelectorAll("#verbs .verb")].some(v => v.textContent.includes(t)),
    text, { timeout }
  ).then(() => true).catch(() => false);
async function clickVerb(text) {
  if (!(await waitVerb(text))) throw new Error("verb never appeared: " + text);
  await page.locator("#verbs .verb", { hasText: text }).first().click();
}
const dev = (fn) => page.evaluate(fn).catch(e => {
  if (String(e).includes("Execution context was destroyed")) return undefined; // reload race, expected on DEV.goto
  throw e;
});

// ---------------------------------------------------------------- test 1 ---
console.log("\n[1] fresh boot, night 1 scripted sit, full first loop");
await page.goto(URL);
ok(await waitLine("T H E   L O N G   H E L L O"), "title renders");
await clickVerb("begin");
ok(await waitLine("the ward is quiet."), "night 1 opens");
ok((await page.locator("#hd-left").innerText()) === "NIGHT 1", "header NIGHT 1");
await clickVerb("sit with him");
ok(await waitLine("he doesn't need you to say anything."), "scripted sit prints");
ok(await waitLine("the shift is over."), "ward ends");
ok(await waitLine("the canal path."), "walk begins");
ok((await page.locator("#hd-left").innerText()) === "MORNING", "header MORNING");
ok(await waitLine("the flat: the kettle."), "flat reached");
await clickVerb("sleep");
ok(await waitLine("sleep comes like a tide"), "sleep line");
ok(await page.waitForFunction(() => document.getElementById("hd-left").textContent === "NIGHT 2", null, { timeout: 20000 }).then(() => true).catch(() => false), "night 2 header");
ok(!(await page.locator("#ticker").evaluate(t => t.classList.contains("on"))), "ticker hidden pre-arrival");
const sat1 = await dev(() => DEV.state().satPatients);
ok(sat1.okafor === true, "okafor counted as sat-with");

// ---------------------------------------------------------------- test 2 ---
console.log("\n[2] night 3 walk — the arrival");
await dev(() => DEV.goto(3));
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
ok(await waitLine("you know this music."), "night 3 ward");
await clickVerb("finish the rounds");
ok(await waitLine("there is something in the park."), "arrival line");
ok(await waitLine(".------."), "egg ascii art shown");
ok(await page.waitForFunction(() => document.getElementById("ticker").classList.contains("on"), null, { timeout: 20000 }).then(() => true).catch(() => false), "ticker turns on");
const tickerTxt = await page.locator("#ticker .inner").innerText();
ok(tickerTxt.includes("PARIS. LAGOS. CHENNAI."), "arrival ticker line");
ok(await waitLine("the ceiling, for a long time."), "arrival close");

// ---------------------------------------------------------------- test 3 ---
console.log("\n[3] night 6 park — inscription, sit, deflection, cap");
await dev(() => DEV.goto(6));
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
await waitLine("edith, on the news");
await clickVerb("say nothing");
await clickVerb("finish the rounds");
await waitLine("the shift is over.");
await clickVerb("stop at the park");
ok(await waitLine("municipal. possibly stolen."), "bench arrives night 6");
await clickVerb("walk around it");
ok(await waitLine("WE WISH YOU TO KNOW"), "inscription clause 1");
ok(await waitLine("AND WE MEAN NO HARM."), "inscription clause 3");
ok(await waitLine("you come back to where you started."), "circle completes");
// look — same text forever
await clickVerb("look at it");
ok(await waitLine("there is no seam on it anywhere."), "look text");
// sit, accrue, break stillness with a key
await clickVerb("sit on the bench");
await waitLine("you sit on the bench.");
await page.waitForTimeout(600); // ~20 virtual seconds of stillness
await page.keyboard.press("x");
ok(await waitVerb("get up"), "get up appears after keypress");
const deflected = await dev(() =>
  ["a jogger passes.", "the moment thins.", "a dog noses the bench leg", "wind moves the canal trees", "a bicycle bell"]
    .some(d => document.getElementById("log").innerText.includes(d)));
ok(deflected, "deflection printed on keypress");
await clickVerb("get up");
const p1 = await dev(() => DEV.state().presence_egg);
ok(p1 > 2, `presence accrued while sitting (egg=${p1.toFixed(1)})`);
// sit again to the cap
await clickVerb("sit on the bench");
ok(await waitLine("the cold gets into your coat. time to go."), "sit cap line");
await clickVerb("sit on the bench");
ok(await waitLine("the cold is in your coat now."), "re-sit after cap refused");
ok(!(await dev(() => [...document.querySelectorAll("#verbs .verb")].some(v => v.textContent.includes("ask it")))), "ask locked before night 8");
await clickVerb("walk home");
await clickVerb("sleep");
const st3 = await dev(() => DEV.state());
ok(st3.demandHistory[st3.demandHistory.length - 1] === 0, "clean visit recorded");

// ---------------------------------------------------------------- test 4 ---
console.log("\n[4] hum + second message ceremony");
await dev(() => { DEV.grantMsg(); DEV.set("humHeard", false); DEV.goto(30); });
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
await waitLine("can you just sit");
await clickVerb("sit with her");
ok(await waitLine("her hand finds the edge of your sleeve."), "dee scripted sit");
await waitLine("the shift is over.");
await clickVerb("stop at the park");
if (await waitVerb("let her be", 8000)) await clickVerb("let her be"); // widow, first visit past night 25
await clickVerb("sit on the bench");
ok(await waitLine("a feeling in the teeth."), "hum discovered");
ok(await waitLine("THANK YOU FOR NOT FLINCHING."), "second message fires");
await page.keyboard.press(" "); // try to skip mid-ceremony
ok(await waitLine("there is no hurry.", 5000), "space refused with 'there is no hurry.'");
ok(await waitLine("WE HAVE ALL THE TIME YOU NEED."), "second message completes");
ok(await waitLine("you will never see it again."), "fade lines");
ok(await waitLine("you walk home without noticing the walk."), "after-message walk home");
const meta1 = await dev(() => DEV.meta());
ok(meta1.secondMessageSeen === true, "meta.secondMessageSeen persisted");
ok(await dev(() => DEV.state().secondMessage), "state.secondMessage set");

// ---------------------------------------------------------------- test 5 ---
console.log("\n[5] save-scum: fresh save, meta remembered");
await dev(() => DEV.freshSave()).catch(() => {}); // reload destroys the eval context
await page.waitForLoadState("domcontentloaded");
await clickVerb("begin");
await waitLine("the ward is quiet.");
await dev(() => { DEV.grantMsg(); DEV.goto(30); });
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
await waitLine("can you just sit");
await clickVerb("sit with her");
await waitLine("the shift is over.");
await clickVerb("stop at the park");
if (await waitVerb("let her be", 8000)) await clickVerb("let her be");
await clickVerb("sit on the bench");
ok(await waitLine("it is warm. once is all anyone gets."), "save-scum line");
ok(!(await logText()).includes("THANK YOU FOR NOT FLINCHING."), "ceremony NOT replayed");

// ---------------------------------------------------------------- test 6 ---
console.log("\n[6] endings");
// distant ending
await dev(() => { DEV.set("secondMessage", false); DEV.goto("sp4"); });
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
ok(await waitLine("the quiet man's bed is empty."), "final ward");
ok(await waitLine("the tai chi man is there"), "tai chi man");
ok(await waitLine("patient as weather."), "distant ending line");
ok(await waitLine("somewhere out past everything, the long hello continues."), "epilogue");
ok(await waitVerb("begin again"), "begin again offered");
// intimate ending
await dev(() => { DEV.set("secondMessage", true); DEV.goto("sp4"); });
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
ok(await waitLine("you know what it would say."), "intimate ending line");

// ---------------------------------------------------------------- test 7 ---
console.log("\n[7] title idle + resume mid-game");
await dev(() => DEV.wipe());
await page.waitForLoadState("domcontentloaded");
await waitLine("T H E   L O N G   H E L L O");
await page.waitForTimeout(2200); // 60s / 40 = 1.5s idle
ok(await waitLine("there is no hurry.", 4000), "title idle reward");
ok(await dev(() => DEV.meta().titleStill === true), "titleStill flag set");
await clickVerb("begin");
await waitLine("the ward is quiet.");
await clickVerb("sit with him");
await waitLine("the shift is over.");
await waitVerb("sleep"); // idle at the flat menu — a stable save point
await page.reload();
ok(await waitVerb("continue"), "resume offered after reload");
await clickVerb("continue");
ok(await waitLine("the flat: the kettle."), "resumes at flat phase");

// ---------------------------------------------------------------- test 8 ---
console.log("\n[8] act III ticker silence + widow/leave");
await dev(() => { DEV.set("widowSeen", false); DEV.goto(25); });
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
await waitLine("dee's mother visited");
await clickVerb("pull up the chair");
await page.waitForTimeout(400);
await page.keyboard.press("x");
await clickVerb("slip out");
await waitLine("the shift is over.");
await clickVerb("stop at the park");
ok(await waitLine("\"forty years,\""), "widow scene");
await clickVerb("let her be");
await clickVerb("ask it");
ok(await waitLine("it is not a refusal. it is patience."), "ask/demand text");
const dAsk = await dev(() => DEV.state().demands);
ok(dAsk === 1, "demand counted");
ok(await waitVerb("leave something"), "leave something unlocked");
await clickVerb("leave something");
await clickVerb("write something");
ok(await waitLine("one line:"), "typed input prompt");
await page.locator("#verbs input").fill("hello yourself");
await page.keyboard.press("Enter");
ok(await waitLine("the wind reads it first."), "written line left");
await clickVerb("walk home");
// act III: au2 — leave-gone callback + blank ticker
await dev(() => DEV.goto("au2"));
await page.waitForLoadState("domcontentloaded");
await clickVerb("continue");
await waitLine("card tricks");
await clickVerb("finish the rounds");
await waitLine("the shift is over.");
await clickVerb("stop at the park");
ok(await waitLine("accepted."), "left-thing-gone callback");
const tickerNow = await page.locator("#ticker .inner").innerText();
ok(tickerNow.trim() === "" || !tickerNow.includes("LAGOS"), "ticker quiet in late act III");

console.log(`\n${passed} passed, ${failed} failed`);
if (errors.length) { console.log("\npage errors:"); errors.forEach(e => console.log("  " + e)); }
await browser.close();
server.close();
process.exit(failed || errors.length ? 1 : 0);
