"use strict";

const { chromium } = require("playwright");

const url = process.argv[2] || "http://127.0.0.1:8765/capstone-presentation.html";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1200);

  if (await page.locator("section.slide.active").getAttribute("id") !== "core-title") {
    throw new Error("Normal launch did not open the title slide");
  }

  const stage = await page.locator("#deckStage").boundingBox();
  const expectedRatio = 16 / 9;
  const actualRatio = stage.width / stage.height;
  if (Math.abs(actualRatio - expectedRatio) > 0.01) throw new Error("Phone viewport changed the 16:9 stage ratio");

  await page.evaluate(() => window.deck.showSlide(1));
  await page.locator("#core-background .explore-trigger").click();
  if (await page.locator("section.slide.active").getAttribute("id") !== "qa-fracture-reliability") {
    throw new Error("Explore did not open the expected Q&A route");
  }
  await page.keyboard.press("Escape");
  if (await page.locator("section.slide.active").getAttribute("id") !== "core-background") {
    throw new Error("Escape did not restore the originating core slide");
  }
  if (await page.locator("#counter").textContent() !== "2 / 17") {
    throw new Error("Q&A return changed core progress");
  }

  await page.evaluate(() => window.deck.showSlide(5));
  await page.locator("#core-preprocessing .risk-gate-trigger").first().click();
  await page.keyboard.press("ArrowRight");
  if (await page.locator("section.slide.active").getAttribute("id") !== "core-preprocessing") {
    throw new Error("Risk detail did not lock slide navigation");
  }
  await page.locator(".risk-overlay-close").click();

  await page.evaluate(() => window.deck.showSlide(7));
  await page.locator(".architecture-stage[data-architecture-stage='decoder']").click();
  if (!await page.locator(".architecture-stage[data-architecture-stage='decoder']").evaluate(node => node.classList.contains("is-active"))) {
    throw new Error("Architecture stage did not become active");
  }

  await page.evaluate(() => window.deck.showSlide(0));
  for (let index = 1; index < 17; index += 1) await page.keyboard.press("ArrowRight");
  const finalId = await page.locator("section.slide.active").getAttribute("id");
  const finalCounter = await page.locator("#counter").textContent();
  if (finalId !== "core-conclusion" || finalCounter !== "17 / 17") {
    throw new Error("Core keyboard route did not end at slide 17");
  }

  const summary = { viewport: "390x844", stage, finalId, finalCounter, consoleErrors, pageErrors };
  process.stdout.write(JSON.stringify(summary, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
