"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseUrl = (process.argv[2] || "http://127.0.0.1:8765/capstone-presentation.html").split("#")[0];
const outputRoot = path.resolve(process.argv[3] || "qa-renders-chrome");
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserPath = process.env.CAPSTONE_BROWSER || edgePath;

function words(value) { return value.trim().split(/\s+/).filter(Boolean).length; }

(async () => {
  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => failedRequests.push(request.url()));

  await page.goto(`${baseUrl}#1`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1200);

  const structure = await page.evaluate(() => ({
    main: document.querySelectorAll('.slide[data-section="main"]').length,
    appendix: document.querySelectorAll('.slide[data-section="appendix"]').length,
    legacyInDom: document.querySelectorAll('.slide:not([data-section])').length,
    stage: [document.querySelector("#deckStage").offsetWidth, document.querySelector("#deckStage").offsetHeight],
    editIds: [...document.querySelectorAll("[data-editable]")].map(element => element.dataset.editId || null)
  }));

  const slides = [];
  const hashes = [...Array(21)].map((_, index) => `#${index + 1}`).concat([...Array(8)].map((_, index) => `#a${index + 1}`));
  for (const hash of hashes) {
    await page.goto(`${baseUrl}${hash}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);
    const visual = page.locator(".slide.active [data-visual]");
    if (await visual.count()) {
      await page.waitForFunction(() => {
        const stages = [...document.querySelectorAll(".slide.active .model-stage")];
        return stages.every(stage => stage.classList.contains("ready") || stage.classList.contains("failed"));
      }, null, { timeout: 30000 }).catch(() => {});
    }
    const stepCount = Math.max(1, await page.locator(".slide.active [data-step-panel]").count());
    const states = [];
    for (let step = 0; step < stepCount; step += 1) {
      if (step > 0) {
        await page.locator(".slide.active .model-next").click();
        await page.waitForTimeout(320);
      }
      states.push(await page.evaluate(() => {
        const slide = document.querySelector(".slide.active");
        const inner = slide.querySelector(".slide-inner");
        const title = slide.querySelector("h1,h2");
        const stageStates = [...slide.querySelectorAll(".model-stage")].map(stage => stage.classList.contains("ready") ? "ready" : stage.classList.contains("failed") ? "fallback" : "loading");
        return {
          activePanels: slide.querySelectorAll("[data-step-panel].active").length,
          innerOverflow: inner ? inner.scrollHeight > inner.clientHeight + 2 || inner.scrollWidth > inner.clientWidth + 2 : false,
          titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : 0,
          stageStates
        };
      }));
    }
    const meta = await page.evaluate(() => {
      const slide = document.querySelector(".slide.active");
      const visibleText = [...slide.querySelectorAll("p,li")].filter(element => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && !element.closest(".source");
      }).map(element => element.textContent.trim()).join(" ");
      return { title: slide.dataset.title, section: slide.dataset.section, visuals: slide.querySelectorAll("[data-visual-item]").length, visibleText };
    });
    const fileName = `${hash.slice(1).padStart(2, "0")}.png`;
    await page.screenshot({ path: path.join(outputRoot, fileName) });
    slides.push({ hash, ...meta, titleWords: words(meta.title), narrativeWords: words(meta.visibleText), states, fileName });
  }

  await page.goto(`${baseUrl}#21`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("ArrowRight");
  const mainStop = await page.evaluate(() => ({ hash: location.hash, counter: document.querySelector("#counter").textContent }));
  await page.keyboard.press("a");
  const appendixOpen = await page.evaluate(() => ({ hash: location.hash, counter: document.querySelector("#counter").textContent }));
  await page.keyboard.press("End");
  const appendixEnd = await page.evaluate(() => ({ hash: location.hash, counter: document.querySelector("#counter").textContent }));
  await page.keyboard.press("Escape");
  const appendixReturn = await page.evaluate(() => ({ hash: location.hash, counter: document.querySelector("#counter").textContent }));
  await page.keyboard.press("d");
  const demoInput = await page.evaluate(() => ({ open: document.querySelector("#demoOverlay").classList.contains("open"), state: document.querySelector('.demo-state[data-demo-state="0"]').classList.contains("active") }));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  const demoOutput = await page.evaluate(() => {
    const canvas = document.querySelector("#demoOverlay canvas");
    return { state: document.querySelector('.demo-state[data-demo-state="1"]').classList.contains("active"), model: document.querySelector("#demoOverlay .model-stage").className, canvas: [canvas.width, canvas.height] };
  });
  await page.screenshot({ path: path.join(outputRoot, "demo-output.png") });
  await page.keyboard.press("Escape");
  const demoReturn = await page.evaluate(() => ({ open: document.querySelector("#demoOverlay").classList.contains("open"), hash: location.hash }));

  const viewportChecks = [];
  for (const viewport of [[1920, 1080], [1280, 720], [390, 844]]) {
    await page.setViewportSize({ width: viewport[0], height: viewport[1] });
    await page.goto(`${baseUrl}#17`, { waitUntil: "domcontentloaded" });
    viewportChecks.push(await page.evaluate(() => {
      const stage = document.querySelector("#deckStage");
      const box = stage.getBoundingClientRect();
      return { viewport: [innerWidth, innerHeight], authored: [stage.offsetWidth, stage.offsetHeight], rendered: [box.width, box.height], transform: stage.style.transform };
    }));
  }

  const failures = [];
  if (structure.main !== 21) failures.push(`Expected 21 main slides; found ${structure.main}`);
  if (structure.appendix !== 8) failures.push(`Expected 8 appendix slides; found ${structure.appendix}`);
  if (structure.legacyInDom) failures.push(`Found ${structure.legacyInDom} unsectioned slides in live DOM`);
  if (structure.stage.join("x") !== "1920x1080") failures.push(`Stage is ${structure.stage.join("x")}`);
  if (structure.editIds.some(id => !id) || new Set(structure.editIds).size !== structure.editIds.length) failures.push("Missing or duplicate edit IDs");
  slides.filter(slide => slide.section === "main").forEach((slide, index) => {
    if (slide.visuals > 3) failures.push(`Slide ${index + 1} has ${slide.visuals} visual regions`);
    if (index > 0 && (slide.titleWords < 3 || slide.titleWords > 7)) failures.push(`Slide ${index + 1} title has ${slide.titleWords} words`);
    if (slide.states.some(state => state.titleLines > 1)) failures.push(`Slide ${index + 1} title wraps`);
    if (slide.states.some(state => state.innerOverflow)) failures.push(`Slide ${index + 1} overflows its authored content area`);
    if (slide.states.some(state => state.stageStates.includes("loading"))) failures.push(`Slide ${index + 1} visual did not resolve`);
  });
  if (mainStop.hash !== "#21" || mainStop.counter !== "21 / 21") failures.push("Main navigation does not stop at Slide 21");
  if (appendixOpen.hash !== "#a1" || appendixOpen.counter !== "A1 / A8") failures.push("Appendix did not open at A1");
  if (appendixEnd.hash !== "#a8") failures.push("Appendix End did not reach A8");
  if (appendixReturn.hash !== "#21") failures.push("Escape did not return to the previous main slide");
  if (!demoInput.open || !demoInput.state || !demoOutput.state || demoReturn.open || demoReturn.hash !== "#21") failures.push("Demo mode transition failed");
  if (demoOutput.model.includes("ready") && Math.min(...demoOutput.canvas) <= 1) failures.push("Demo WebGL canvas remained at fallback dimensions");
  if (consoleErrors.length || pageErrors.length || failedRequests.length) failures.push("Browser errors or failed requests were recorded");

  const report = { structure, slides, navigation: { mainStop, appendixOpen, appendixEnd, appendixReturn, demoInput, demoOutput, demoReturn }, viewportChecks, consoleErrors, pageErrors, failedRequests, failures };
  fs.writeFileSync(path.join(outputRoot, "qa-report.json"), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ main: structure.main, appendix: structure.appendix, renderStates: slides.reduce((sum, slide) => sum + slide.states.length, 0), failures, consoleErrors, pageErrors, failedRequests }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
