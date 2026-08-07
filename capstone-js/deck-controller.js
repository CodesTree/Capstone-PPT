
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

  class SlidePresentation {
    constructor() {
      this.slides = [...document.querySelectorAll(".slide")];
      this.currentSlide = 0;
      this.stage = document.getElementById("deckStage");
      this.counter = document.getElementById("counter");
      this.progress = document.getElementById("progressFill");
      this.wheelLocked = false;
      this.touchStartX = 0;
      this.assignNumbers();
      this.setupStageScale();
      this.setupNavigation();
      this.showSlide(this.readHash());
    }

    assignNumbers() {
      this.slides.forEach((slide, index) => {
        const marker = slide.querySelector(".slide-no");
        if (marker) marker.textContent = String(index + 1).padStart(2, "0");
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
        if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(event.key)) {
          event.preventDefault();
          this.next();
        }
        if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
          event.preventDefault();
          this.prev();
        }
        if (event.key === "Home") this.showSlide(0);
        if (event.key === "End") this.showSlide(this.slides.length - 1);
      });
      document.getElementById("prevBtn").addEventListener("click", () => this.prev());
      document.getElementById("nextBtn").addEventListener("click", () => this.next());
      window.addEventListener("wheel", event => {
        if (this.wheelLocked || Math.abs(event.deltaY) < 18) return;
        this.wheelLocked = true;
        event.deltaY > 0 ? this.next() : this.prev();
        setTimeout(() => { this.wheelLocked = false; }, 420);
      }, { passive: true });
      window.addEventListener("touchstart", event => {
        this.touchStartX = event.changedTouches[0].screenX;
      }, { passive: true });
      window.addEventListener("touchend", event => {
        const delta = event.changedTouches[0].screenX - this.touchStartX;
        if (Math.abs(delta) > 50) delta < 0 ? this.next() : this.prev();
      }, { passive: true });
      window.addEventListener("hashchange", () => this.showSlide(this.readHash(), false));
    }

    readHash() {
      const value = parseInt(location.hash.replace("#", ""), 10);
      return Number.isFinite(value) ? value - 1 : 0;
    }

    showSlide(index, updateHash = true) {
      const previous = this.currentSlide;
      this.currentSlide = Math.max(0, Math.min(index, this.slides.length - 1));
      this.slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === this.currentSlide);
        slide.classList.toggle("visible", slideIndex === this.currentSlide);
      });
      this.counter.textContent = `${this.currentSlide + 1} / ${this.slides.length}`;
      this.progress.style.width = `${((this.currentSlide + 1) / this.slides.length) * 100}%`;
      const current = this.slides[this.currentSlide];
      document.title = `${this.currentSlide + 1}. ${current.dataset.title} — 3D Knee Reconstruction`;
      if (updateHash) history.replaceState(null, "", `#${this.currentSlide + 1}`);
      window.dispatchEvent(new CustomEvent("deck:slidechange", {
        detail: { previous, current: this.currentSlide, slide: current }
      }));
    }

    next() { this.showSlide(this.currentSlide + 1); }
    prev() { this.showSlide(this.currentSlide - 1); }
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

