(function () {
  "use strict";

  const V2_COMPATIBLE_IDS = {
    "title-1": "s01-title",
    "title-2": "s01-subtitle",
    "title-3": "s01-author",
    "research-question-1": "s06-title",
    "main-result-1": "s17-title",
    "conclusion-1": "s21-title"
  };

  class SlidePresentation {
    constructor() {
      this.mainSlides = [...document.querySelectorAll('.slide[data-section="main"]')];
      this.appendixSlides = [...document.querySelectorAll('.slide[data-section="appendix"]')];
      this.mode = "main";
      this.mainIndex = 0;
      this.appendixIndex = 0;
      this.stage = document.getElementById("deckStage");
      this.counter = document.getElementById("counter");
      this.progress = document.getElementById("progressFill");
      this.demo = document.getElementById("demoOverlay");
      this.demoState = 0;
      this.wheelLocked = false;
      this.touchStartX = 0;
      this.assignNumbers();
      this.setupStageScale();
      this.setupDemo();
      this.setupNavigation();
      this.readHash();
      this.render(false);
    }

    get activeSlides() { return this.mode === "appendix" ? this.appendixSlides : this.mainSlides; }
    get activeIndex() { return this.mode === "appendix" ? this.appendixIndex : this.mainIndex; }

    assignNumbers() {
      this.mainSlides.forEach((slide, index) => {
        const marker = slide.querySelector(".slide-no");
        if (marker) marker.textContent = String(index + 1).padStart(2, "0");
      });
      this.appendixSlides.forEach((slide, index) => {
        const marker = slide.querySelector(".slide-no");
        if (marker) marker.textContent = `A${index + 1}`;
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
        const editing = event.target?.getAttribute?.("contenteditable") === "true";
        if (editing) return;
        if (event.key === "Escape") {
          if (this.demo.classList.contains("open")) this.closeDemo();
          else if (this.mode === "appendix") this.enterMain(this.mainIndex);
          return;
        }
        if (this.demo.classList.contains("open")) {
          if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(event.key)) this.nextDemoState();
          return;
        }
        if (event.key.toLowerCase() === "a") { event.preventDefault(); this.enterAppendix(0); return; }
        if (event.key.toLowerCase() === "d") { event.preventDefault(); this.openDemo(); return; }
        if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(event.key)) { event.preventDefault(); this.next(); }
        if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); this.prev(); }
        if (event.key === "Home") this.show(0);
        if (event.key === "End") this.show(this.activeSlides.length - 1);
      });
      document.getElementById("prevBtn").addEventListener("click", () => this.prev());
      document.getElementById("nextBtn").addEventListener("click", () => this.next());
        document.getElementById("appendixBtn").addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          this.enterAppendix(0);
        });
        document.getElementById("demoBtn").addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          this.openDemo();
        });
      window.addEventListener("wheel", event => {
        if (this.demo.classList.contains("open") || this.wheelLocked || Math.abs(event.deltaY) < 18) return;
        this.wheelLocked = true;
        event.deltaY > 0 ? this.next() : this.prev();
        setTimeout(() => { this.wheelLocked = false; }, 420);
      }, { passive: true });
      window.addEventListener("touchstart", event => { this.touchStartX = event.changedTouches[0].screenX; }, { passive: true });
      window.addEventListener("touchend", event => {
        if (this.demo.classList.contains("open")) return;
        const delta = event.changedTouches[0].screenX - this.touchStartX;
        if (Math.abs(delta) > 50) delta < 0 ? this.next() : this.prev();
      }, { passive: true });
      window.addEventListener("hashchange", () => { this.readHash(); this.render(false); });
    }

    readHash() {
      const hash = location.hash.slice(1).toLowerCase();
      const appendix = hash.match(/^a([1-8])$/);
      if (appendix) {
        this.mode = "appendix";
        this.appendixIndex = Number(appendix[1]) - 1;
        return;
      }
      const main = Number.parseInt(hash, 10);
      this.mode = "main";
      this.mainIndex = Number.isFinite(main) ? Math.max(0, Math.min(main - 1, this.mainSlides.length - 1)) : 0;
    }

    render(updateHash = true) {
      const current = this.activeSlides[this.activeIndex];
      [...this.mainSlides, ...this.appendixSlides].forEach(slide => {
        const active = slide === current;
        slide.classList.toggle("active", active);
        slide.classList.toggle("visible", active);
      });
      const prefix = this.mode === "appendix" ? "A" : "";
      this.counter.textContent = `${prefix}${this.activeIndex + 1} / ${prefix}${this.activeSlides.length}`;
      this.progress.style.width = `${((this.activeIndex + 1) / this.activeSlides.length) * 100}%`;
      document.title = `${prefix}${this.activeIndex + 1}. ${current.dataset.title} — 3D Knee Reconstruction`;
      if (updateHash) history.replaceState(null, "", this.mode === "appendix" ? `#a${this.appendixIndex + 1}` : `#${this.mainIndex + 1}`);
      window.dispatchEvent(new CustomEvent("deck:slidechange", { detail: { mode: this.mode, current: this.activeIndex, slide: current } }));
    }

    show(index) {
      const bounded = Math.max(0, Math.min(index, this.activeSlides.length - 1));
      if (this.mode === "appendix") this.appendixIndex = bounded;
      else this.mainIndex = bounded;
      this.render();
    }
    next() { this.show(this.activeIndex + 1); }
    prev() { this.show(this.activeIndex - 1); }
    enterAppendix(index = 0) { this.mode = "appendix"; this.appendixIndex = index; this.render(); }
    enterMain(index = this.mainIndex) { this.mode = "main"; this.mainIndex = index; this.render(); }

    setupDemo() {
      document.getElementById("demoLaunch").addEventListener("click", () => this.openDemo());
      document.getElementById("demoClose").addEventListener("click", () => this.closeDemo());
      document.getElementById("demoNext").addEventListener("click", () => this.nextDemoState());
      const drr = window.CapstoneModelAssets?.drr;
      if (drr) {
        document.getElementById("demoAp").src = drr.ap;
        document.getElementById("demoLat").src = drr.lat;
      }
    }
    openDemo() {
      if (this.mode !== "main" || this.mainIndex !== this.mainSlides.length - 1) this.enterMain(this.mainSlides.length - 1);
      this.demoState = 0;
      this.updateDemoState();
      this.demo.classList.add("open");
      this.demo.setAttribute("aria-hidden", "false");
      document.getElementById("demoClose").focus();
      window.dispatchEvent(new CustomEvent("deck:demochange", { detail: { open: true, state: 0 } }));
    }
    nextDemoState() { this.demoState = this.demoState ? 0 : 1; this.updateDemoState(); }
    updateDemoState() {
      this.demo.querySelectorAll("[data-demo-state]").forEach((state, index) => state.classList.toggle("active", index === this.demoState));
      document.getElementById("demoNext").textContent = this.demoState ? "Show inputs" : "Reveal output";
      window.dispatchEvent(new CustomEvent("deck:demochange", { detail: { open: this.demo.classList.contains("open"), state: this.demoState } }));
      if (this.demoState === 1 && this.demo.classList.contains("open")) {
        requestAnimationFrame(() => window.dispatchEvent(new Event("deck:resize")));
      }
    }
    closeDemo() {
      this.demo.classList.remove("open");
      this.demo.setAttribute("aria-hidden", "true");
      this.demoState = 0;
      this.updateDemoState();
      document.getElementById("demoLaunch").focus();
      window.dispatchEvent(new CustomEvent("deck:demochange", { detail: { open: false } }));
    }
  }

  class InlineEditor {
    constructor() {
      this.isActive = false;
      this.key = "capstone-knee-deck-edits-v3";
      this.v2Key = "capstone-knee-deck-edits-v2";
      this.editables = [...document.querySelectorAll("[data-editable][data-edit-id]")];
      this.restore();
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
    restore() {
      let saved;
      try { saved = JSON.parse(localStorage.getItem(this.key) || "null"); } catch (_) { saved = null; }
      if (!saved) {
        try {
          const v2 = JSON.parse(localStorage.getItem(this.v2Key) || "null");
          if (v2 && !Array.isArray(v2)) {
            saved = {};
            Object.entries(V2_COMPATIBLE_IDS).forEach(([oldId, newId]) => { if (typeof v2[oldId] === "string") saved[newId] = v2[oldId]; });
            localStorage.setItem(this.key, JSON.stringify(saved));
          }
        } catch (_) { saved = null; }
      }
      if (!saved) return;
      this.editables.forEach(element => { if (typeof saved[element.dataset.editId] === "string") element.innerHTML = saved[element.dataset.editId]; });
    }
    download() {
      this.save();
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll("[contenteditable]").forEach(element => element.removeAttribute("contenteditable"));
      const blob = new Blob(["<!DOCTYPE html>\n" + clone.outerHTML], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "capstone-presentation.html";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  const deck = new SlidePresentation();
  const editor = new InlineEditor();
  const hotzone = document.querySelector(".edit-hotzone");
  const editToggle = document.getElementById("editToggle");
  let hideTimeout;
  const toggle = () => editor.toggleEditMode();
  editToggle.addEventListener("click", toggle);
  hotzone.addEventListener("click", toggle);
  hotzone.addEventListener("mouseenter", () => { clearTimeout(hideTimeout); editToggle.classList.add("show"); });
  hotzone.addEventListener("mouseleave", () => { hideTimeout = setTimeout(() => { if (!editor.isActive) editToggle.classList.remove("show"); }, 400); });
  document.addEventListener("keydown", event => {
    const editing = event.target?.getAttribute?.("contenteditable") === "true";
    if (event.key.toLowerCase() === "e" && !editing) editor.toggleEditMode();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); editor.save(); editor.download(); }
  });
  window.deck = deck;
  window.deckEditor = editor;
})();
