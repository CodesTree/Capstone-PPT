
(function () {
  "use strict";

  const V1_EDIT_MAP = {
    "Title": [0, 4],
    "The inverse problem": [4, 3],
    "Why it matters": [7, 4],
    "Literature trajectory": [11, 8],
    "Research gap": [19, 5],
    "Research question": [24, 5],
    "Cohort": [29, 5],
    "Preparation pipeline": [34, 9],
    "Shared front end": [43, 4],
    "Controlled experiment": [47, 6],
    "Evaluation": [53, 6],
    "Main result": [59, 3],
    "Fold robustness": [62, 3],
    "Subgroup results": [65, 2],
    "Failure analysis": [67, 2],
    "Bottleneck hypothesis": [69, 4],
    "Responsible computing": [73, 9],
    "Conclusion": [82, 5],
    "Future work": [87, 7]
  };

  function slug(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const qaRoutes = {
    fracture: "qa-fracture-reliability",
    literature: "qa-literature",
    data: "qa-cohort",
    groundTruth: "qa-ground-truth",
    protocol: "qa-protocol",
    architecture: "qa-p1",
    p2: "qa-p2",
    features: "qa-features",
    lift: "qa-lift",
    decoder: "qa-decoder-detail",
    representation: "qa-front-end-ceiling",
    failures: "qa-failure-case"
  };

  const coreRoute = [
    "core-title",
    "core-background",
    "core-literature-gap",
    "core-research-question",
    "core-dataset",
    "core-preprocessing",
    "core-experimental-design",
    "core-architecture",
    "core-front-end",
    "core-decoder",
    "core-main-results",
    "core-fold-robustness",
    "core-cohort-results",
    "core-failure-analysis",
    "core-lifting-limitation",
    "core-research-evaluation",
    "core-conclusion"
  ];

  class SlidePresentation {
    constructor() {
      this.slides = [...document.querySelectorAll(".slide")];
      this.coreSlides = coreRoute.map(id => document.getElementById(id)).filter(Boolean);
      this.currentSlide = 0;
      this.currentCoreIndex = 0;
      this.activeSlide = this.coreSlides[0];
      this.qaMode = false;
      this.qaReturnId = this.activeSlide?.id || "core-title";
      this.qaReturnFocus = null;
      this.stage = document.getElementById("deckStage");
      this.counter = document.getElementById("counter");
      this.progress = document.getElementById("progressFill");
      this.wheelLocked = false;
      this.touchStartX = 0;
      this.assignNumbers();
      this.setupQaRouting();
      this.setupArchitectureInteraction();
      this.setupStageScale();
      this.setupNavigation();
      this.openInitialRoute();
    }

    assignNumbers() {
      this.coreSlides.forEach((slide, index) => {
        const marker = slide.querySelector(".slide-no");
        if (marker) marker.textContent = String(index + 1).padStart(2, "0");
      });
      this.slides.filter(slide => slide.dataset.route === "qa").forEach(slide => {
        const marker = slide.querySelector(".slide-no");
        if (marker) marker.textContent = "Q&A";
        if (!slide.querySelector(":scope > .qa-badge")) {
          const badge = document.createElement("div");
          badge.className = "qa-badge";
          badge.textContent = "Q&A evidence";
          badge.setAttribute("aria-hidden", "true");
          slide.appendChild(badge);
        }
      });
    }

    actionArea(slide) {
      const topline = slide.querySelector(".topline");
      if (!topline) return slide;
      let actions = topline.querySelector(".slide-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "slide-actions";
        topline.appendChild(actions);
      }
      return actions;
    }

    setupQaRouting() {
      this.coreSlides.forEach(slide => {
        const targetId = slide.dataset.qaTarget;
        if (!targetId || !document.getElementById(targetId)) return;
        const trigger = document.createElement("button");
        trigger.className = "explore-trigger";
        trigger.type = "button";
        trigger.textContent = "+ Explore";
        trigger.setAttribute("aria-controls", targetId);
        trigger.setAttribute("aria-expanded", "false");
        trigger.addEventListener("click", () => this.openQaSlide(targetId, true, trigger));
        trigger.textContent = slide.dataset.exploreLabel || "+ Explore";
        this.actionArea(slide).appendChild(trigger);
      });

      document.querySelectorAll("[data-qa-open]").forEach(trigger => {
        if (trigger.classList.contains("architecture-stage")) return;
        trigger.addEventListener("click", () => this.openQaSlide(trigger.dataset.qaOpen, true, trigger));
      });
    }

    setupArchitectureInteraction() {
      const copy = {
        input: ["Input evidence", "Paired AP and lateral DRRs provide complementary, but depth-collapsed, knee evidence."],
        encoder: ["Fold-specific encoder", "P1 adapts to radiographs; P2 learns correspondence between the paired views without exposing test subjects."],
        "front-end": ["Shared and frozen", "All decoder arms receive the same fused and lifted 3D representation before comparison."],
        decoder: ["Controlled decoder test", "Plain versus residual topology and ReLU versus PReLU are the only intended decoder differences."],
        evaluation: ["Paired evaluation", "Out-of-fold four-bone volumes are compared with Dice, ASSD, cohort and explicit failure analysis."]
      };
      const detail = document.getElementById("architectureDetail");
      const detailLabel = detail?.closest(".architecture-detail")?.querySelector(".detail-label");
      const detailButton = document.getElementById("architectureDetailOpen");
      document.querySelectorAll(".architecture-stage").forEach(stage => {
        stage.addEventListener("click", () => {
          document.querySelectorAll(".architecture-stage").forEach(item => item.classList.toggle("is-active", item === stage));
          const [label, message] = copy[stage.dataset.architectureStage] || copy["front-end"];
          if (detailLabel) detailLabel.textContent = label;
          if (detail) detail.textContent = message;
          if (detailButton) detailButton.dataset.qaOpen = stage.dataset.qaOpen;
        });
      });
    }

    setupStageScale() {
      const scale = () => {
        const factor = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
        const x = (window.innerWidth - 1920 * factor) / 2;
        const y = (window.innerHeight - 1080 * factor) / 2;
        this.stage.style.transform = `translate(${x}px, ${y}px) scale(${factor})`;
        window.dispatchEvent(new CustomEvent("deck:resize", { detail: { factor } }));
      };
      scale();
      window.addEventListener("resize", scale);
    }

    setupNavigation() {
      document.addEventListener("keydown", event => {
        const editing = event.target && event.target.getAttribute && event.target.getAttribute("contenteditable") === "true";
        if (editing) return;
        if (document.querySelector(".risk-gate.open")) return;
        if (event.key === "Escape" && this.qaMode && !document.querySelector(".risk-gate.open")) {
          event.preventDefault();
          this.returnFromQa();
          return;
        }
        if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(event.key)) {
          event.preventDefault();
          this.next();
        }
        if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
          event.preventDefault();
          this.prev();
        }
        if (event.key === "Home" && !this.qaMode) this.showSlide(0);
        if (event.key === "End" && !this.qaMode) this.showSlide(this.coreSlides.length - 1);
      });
      document.getElementById("prevBtn").addEventListener("click", () => this.prev());
      document.getElementById("nextBtn").addEventListener("click", () => this.next());
      window.addEventListener("wheel", event => {
        if (document.querySelector(".risk-gate.open")) return;
        if (this.wheelLocked || Math.abs(event.deltaY) < 18) return;
        this.wheelLocked = true;
        event.deltaY > 0 ? this.next() : this.prev();
        setTimeout(() => { this.wheelLocked = false; }, 420);
      }, { passive: true });
      window.addEventListener("touchstart", event => {
        this.touchStartX = event.changedTouches[0].screenX;
      }, { passive: true });
      window.addEventListener("touchend", event => {
        if (document.querySelector(".risk-gate.open")) return;
        const delta = event.changedTouches[0].screenX - this.touchStartX;
        if (Math.abs(delta) > 50) delta < 0 ? this.next() : this.prev();
      }, { passive: true });
    }

    readHash() {
      return decodeURIComponent(location.hash.replace("#", ""));
    }

    openInitialRoute() {
      const hash = this.readHash();
      const target = hash ? document.getElementById(hash) : null;
      if (target?.classList?.contains("slide") && target.dataset.route === "qa") {
        this.showSlide(0, false);
        this.openQaSlide(target.id, false);
        return;
      }
      const coreIndex = target ? this.coreSlides.indexOf(target) : -1;
      const legacyIndex = parseInt(hash, 10) - 1;
      this.showSlide(coreIndex >= 0 ? coreIndex : (Number.isFinite(legacyIndex) ? legacyIndex : 0), false);
    }

    activateSlide(slide, updateHash, qaMode) {
      const previous = this.currentSlide;
      this.currentSlide = this.slides.indexOf(slide);
      this.activeSlide = slide;
      this.slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === this.currentSlide);
        slide.classList.toggle("visible", slideIndex === this.currentSlide);
        if (slideIndex !== this.currentSlide) slide.classList.remove("qa-active");
      });
      if (qaMode) slide.classList.add("qa-active");
      this.counter.textContent = qaMode
        ? `Q&A · ${this.currentCoreIndex + 1} / ${this.coreSlides.length}`
        : `${this.currentCoreIndex + 1} / ${this.coreSlides.length}`;
      this.progress.style.width = `${((this.currentCoreIndex + 1) / this.coreSlides.length) * 100}%`;
      document.title = `${qaMode ? "Q&A" : this.currentCoreIndex + 1}. ${slide.dataset.title} — 3D Knee Reconstruction`;
      if (updateHash) history.replaceState(null, "", `#${slide.id}`);
      window.dispatchEvent(new CustomEvent("deck:slidechange", {
        detail: { previous, current: this.currentSlide, slide, route: qaMode ? "qa" : "core" }
      }));
    }

    showSlide(index, updateHash = true) {
      this.qaMode = false;
      this.currentCoreIndex = Math.max(0, Math.min(index, this.coreSlides.length - 1));
      this.activateSlide(this.coreSlides[this.currentCoreIndex], updateHash, false);
    }

    openQaSlide(routeOrId, updateHash = true, trigger = null) {
      const targetId = qaRoutes[routeOrId] || routeOrId;
      const target = document.getElementById(targetId);
      if (!target?.classList?.contains("slide") || target.dataset.route !== "qa") return;
      if (!this.qaMode) this.qaReturnId = this.activeSlide?.id || this.coreSlides[this.currentCoreIndex].id;
      this.qaReturnFocus = trigger || this.qaReturnFocus;
      if (trigger?.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "true");
      this.qaMode = true;
      let returnButton = target.querySelector(".slide-actions > .qa-return");
      if (!returnButton) {
        returnButton = document.createElement("button");
        returnButton.className = "qa-return";
        returnButton.type = "button";
        returnButton.textContent = "← Return to presentation";
        returnButton.addEventListener("click", () => this.returnFromQa());
        this.actionArea(target).appendChild(returnButton);
      }
      this.activateSlide(target, updateHash, true);
      requestAnimationFrame(() => returnButton.focus());
    }

    returnFromQa() {
      const returnSlide = document.getElementById(this.qaReturnId);
      const index = Math.max(0, this.coreSlides.indexOf(returnSlide));
      const focusTarget = this.qaReturnFocus;
      this.qaReturnFocus = null;
      if (focusTarget?.hasAttribute("aria-expanded")) focusTarget.setAttribute("aria-expanded", "false");
      this.showSlide(index);
      requestAnimationFrame(() => focusTarget?.focus());
    }

    next() {
      if (!this.qaMode) this.showSlide(this.currentCoreIndex + 1);
    }

    prev() {
      if (!this.qaMode) this.showSlide(this.currentCoreIndex - 1);
    }
  }

  class InlineEditor {
    constructor() {
      this.isActive = false;
      this.key = "capstone-knee-deck-edits-v2";
      this.v1Key = "capstone-knee-deck-edits-v1";
      this.editables = [...document.querySelectorAll("[data-editable]")];
      this.assignStableIds();
      this.restore();
      document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          this.save();
          this.download();
        }
      });
    }

    assignStableIds() {
      document.querySelectorAll(".slide").forEach(slide => {
        const title = slide.dataset.title || "slide";
        [...slide.querySelectorAll("[data-editable]")].forEach((element, index) => {
          if (!element.dataset.editId) element.dataset.editId = `${slug(title)}-${index + 1}`;
        });
      });
    }

    toggleEditMode() {
      this.isActive = !this.isActive;
      document.body.classList.toggle("editing", this.isActive);
      document.getElementById("editToggle").classList.toggle("active", this.isActive);
      this.editables.forEach(element => element.setAttribute("contenteditable", String(this.isActive)));
    }

    save() {
      const values = {};
      this.editables.forEach(element => { values[element.dataset.editId] = element.innerHTML; });
      localStorage.setItem(this.key, JSON.stringify(values));
    }

    migrateV1() {
      const raw = localStorage.getItem(this.v1Key);
      if (!raw) return null;
      try {
        const values = JSON.parse(raw);
        if (!Array.isArray(values)) return null;
        const migrated = {};
        document.querySelectorAll(".slide").forEach(slide => {
          const range = V1_EDIT_MAP[slide.dataset.title];
          if (!range) return;
          const elements = [...slide.querySelectorAll("[data-editable]")];
          const count = Math.min(range[1], elements.length);
          for (let index = 0; index < count; index += 1) {
            const value = values[range[0] + index];
            if (typeof value === "string") migrated[elements[index].dataset.editId] = value;
          }
        });
        localStorage.setItem(this.key, JSON.stringify(migrated));
        return migrated;
      } catch (_) {
        return null;
      }
    }

    restore() {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(this.key) || "null");
      } catch (_) {
        saved = null;
      }
      if (!saved || Array.isArray(saved)) saved = this.migrateV1();
      if (!saved || typeof saved !== "object") return;
      this.editables.forEach(element => {
        const value = saved[element.dataset.editId];
        if (typeof value === "string") element.innerHTML = value;
      });
    }

    download() {
      this.save();
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll("[contenteditable]").forEach(element => element.removeAttribute("contenteditable"));
      const blob = new Blob(["<!DOCTYPE html>\n" + clone.outerHTML], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "capstone-presentation-expanded.html";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  const deck = new SlidePresentation();
  const editor = new InlineEditor();
  const hotzone = document.querySelector(".edit-hotzone");
  const editToggle = document.getElementById("editToggle");
  let hideTimeout = null;

  editToggle.addEventListener("click", () => editor.toggleEditMode());
  hotzone.addEventListener("click", () => editor.toggleEditMode());
  hotzone.addEventListener("mouseenter", () => {
    clearTimeout(hideTimeout);
    editToggle.classList.add("show");
  });
  hotzone.addEventListener("mouseleave", () => {
    hideTimeout = setTimeout(() => {
      if (!editor.isActive) editToggle.classList.remove("show");
    }, 400);
  });
  editToggle.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
  editToggle.addEventListener("mouseleave", () => {
    hideTimeout = setTimeout(() => {
      if (!editor.isActive) editToggle.classList.remove("show");
    }, 400);
  });
  document.addEventListener("keydown", event => {
    const editing = event.target && event.target.getAttribute && event.target.getAttribute("contenteditable") === "true";
    if ((event.key === "e" || event.key === "E") && !editing) editor.toggleEditMode();
  });

  const closeRiskGate = (gate, restoreFocus = false) => {
    if (!gate) return;
    gate.classList.remove("open");
    const trigger = gate.querySelector(".risk-gate-trigger");
    const dialog = gate.querySelector(".risk-bubble");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (dialog) dialog.setAttribute("aria-hidden", "true");
    if (restoreFocus && trigger) trigger.focus();
  };

  document.querySelectorAll(".risk-gate-trigger").forEach(trigger => {
    trigger.addEventListener("click", () => {
      const gate = trigger.closest(".risk-gate");
      document.querySelectorAll(".risk-gate.open").forEach(other => closeRiskGate(other));
      gate.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      const dialog = gate.querySelector(".risk-bubble");
      if (dialog) dialog.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => gate.querySelector(".risk-overlay-close")?.focus());
    });
  });

  document.querySelectorAll(".risk-overlay-close").forEach(button => {
    button.addEventListener("click", () => closeRiskGate(button.closest(".risk-gate"), true));
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const openGate = document.querySelector(".risk-gate.open");
    if (openGate) {
      event.preventDefault();
      closeRiskGate(openGate, true);
    }
  });

  window.addEventListener("deck:slidechange", () => {
    document.querySelectorAll(".risk-gate.open").forEach(gate => closeRiskGate(gate));
  });
  window.deck = deck;
  window.deckEditor = editor;
})();

