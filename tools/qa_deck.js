"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const url = process.argv[2] || "http://127.0.0.1:8765/capstone-presentation.html";
const outputRoot = path.resolve(process.argv[3] || "qa-renders");
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserPath = process.env.CAPSTONE_BROWSER || edgePath;

(async () => {
  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  const localBinaryRequests = [];

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("request", request => {
    const requestUrl = request.url();
    if (/127\.0\.0\.1.*\.(?:glb|gltf|json)(?:\?|$)/i.test(requestUrl)) localBinaryRequests.push(requestUrl);
  });

  await page.goto(url + "#core-title", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1800);

  const routes = await page.locator("section.slide[data-route]").evaluateAll(slides => slides.map(slide => ({
    id: slide.id,
    route: slide.dataset.route,
    title: slide.dataset.title
  })));
  const slideCount = routes.length;
  const results = [];

  for (let slideIndex = 0; slideIndex < routes.length; slideIndex += 1) {
    const route = routes[slideIndex];
    await page.evaluate(item => {
      if (item.route === "core") {
        window.deck.showSlide(window.deck.coreSlides.findIndex(slide => slide.id === item.id));
      } else {
        window.deck.openQaSlide(item.id);
      }
    }, route);
    await page.waitForTimeout(1400);

    const visualCount = await page.locator(".slide.active [data-visual]").count();
    if (visualCount) {
      await page.waitForFunction(() => {
        const stage = document.querySelector(".slide.active .model-stage");
        return stage && (stage.classList.contains("ready") || stage.classList.contains("failed"));
      }, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(250);
    }

    const title = await page.locator(".slide.active").getAttribute("data-title");
    const stepCount = Math.max(1, await page.locator(".slide.active [data-step-panel]").count());
    const states = [];

    for (let step = 0; step < stepCount; step += 1) {
      if (step > 0) {
        await page.locator(".slide.active .model-next").click();
        await page.waitForTimeout(220);
      }

      const audit = await page.evaluate(() => {
        const slide = document.querySelector(".slide.active");
        const slideBox = slide.getBoundingClientRect();
        const selectors = "h1,h2,.statement,.topline,.source,.model-copy,.model-stage,.bone-legend,.card,.image-frame,.bar-list,.matrix";
        const overflows = [...slide.querySelectorAll(selectors)].flatMap(element => {
          const style = getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return [];
          const box = element.getBoundingClientRect();
          const amount = {
            left: Math.max(0, slideBox.left - box.left),
            top: Math.max(0, slideBox.top - box.top),
            right: Math.max(0, box.right - slideBox.right),
            bottom: Math.max(0, box.bottom - slideBox.bottom)
          };
          const maximum = Math.max(amount.left, amount.top, amount.right, amount.bottom);
          return maximum > 2 ? [{ selector: element.className || element.tagName, amount }] : [];
        });
        const stage = slide.querySelector(".model-stage");
        return {
          activePanel: slide.querySelector("[data-step-panel].active")?.textContent.trim().slice(0, 100) || null,
          overflows,
          stageState: stage ? (stage.classList.contains("ready") ? "ready" : stage.classList.contains("failed") ? "failed" : "loading") : null,
          canvasPixels: stage ? {
            width: stage.querySelector("canvas")?.width || 0,
            height: stage.querySelector("canvas")?.height || 0
          } : null
        };
      });

      const fileName = "slide-" + String(slideIndex + 1).padStart(2, "0") + "-step-" + String(step).padStart(2, "0") + ".png";
      await page.screenshot({ path: path.join(outputRoot, fileName), type: "png" });
      states.push({ step, fileName, audit });
    }
    results.push({ slide: slideIndex + 1, id: route.id, route: route.route, title, states });
  }

  const summary = {
    slideCount,
    coreSlideCount: routes.filter(route => route.route === "core").length,
    qaSlideCount: routes.filter(route => route.route === "qa").length,
    renderCount: results.reduce((total, slide) => total + slide.states.length, 0),
    readyVisuals: await page.locator(".model-stage.ready").count(),
    failedVisuals: await page.locator(".model-stage.failed").count(),
    consoleErrors,
    pageErrors,
    localBinaryRequests,
    results
  };
  fs.writeFileSync(path.join(outputRoot, "qa-report.json"), JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify({
    slideCount: summary.slideCount,
    coreSlideCount: summary.coreSlideCount,
    qaSlideCount: summary.qaSlideCount,
    renderCount: summary.renderCount,
    readyVisuals: summary.readyVisuals,
    failedVisuals: summary.failedVisuals,
    consoleErrors: summary.consoleErrors,
    pageErrors: summary.pageErrors,
    localBinaryRequests: summary.localBinaryRequests,
    overflowStates: results.flatMap(item => item.states.filter(state => state.audit.overflows.length).map(state => ({
      slide: item.slide,
      title: item.title,
      step: state.step,
      overflows: state.audit.overflows
    })))
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
