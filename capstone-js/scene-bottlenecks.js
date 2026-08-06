(function () {
  "use strict";

  const { register, ThreeScene } = window.CapstoneScenes;

  function callout(text, style, className = "") {
    const element = document.createElement("div");
    element.className = `visual-label ${className}`;
    element.textContent = text;
    Object.assign(element.style, style);
    return element;
  }

  class BottleneckScene extends ThreeScene {
    async build() {
      this.camera.position.set(6.8, 4.6, 9.5);
      this.camera.lookAt(0, 0, 0);
      this.objects.target = await this.createBoneGroup("failureTarget", { opacity: 0.24, wireframe: true });
      this.objects.prediction = await this.createBoneGroup("failurePrediction", { opacity: 0.92 });
      this.normalizeGroups([this.objects.target, this.objects.prediction], 4.75);
      this.objects.target.rotation.set(-Math.PI / 2, 0, -0.12);
      this.objects.prediction.rotation.copy(this.objects.target.rotation);
      this.scene.add(this.objects.target, this.objects.prediction);
      this.centerGroupsAt([this.objects.target, this.objects.prediction], new this.THREE.Vector3(0, -0.15, 0));

      this.objects.patellaDetail = await this.createBoneGroup("failureTarget", { opacity: 0.92 });
      [...this.objects.patellaDetail.children].forEach(child => {
        if (child.name !== "patella") this.objects.patellaDetail.remove(child);
      });
      this.normalizeGroups([this.objects.patellaDetail], 2.7);
      this.objects.patellaDetail.rotation.copy(this.objects.target.rotation);
      this.scene.add(this.objects.patellaDetail);
      this.centerGroupsAt([this.objects.patellaDetail], new this.THREE.Vector3(0, -0.05, 0));
      this.objects.patellaDetail.visible = false;

      this.objects.caseLabel = callout("VSD_z023_Left · Fold 2 · V-style", { left: "26px", top: "26px" }, "dark-label");
      this.objects.stateLabel = callout("Ground truth", { right: "26px", top: "26px" });
      this.objects.orbitHint = callout("Drag to orbit", { right: "26px", bottom: "92px" }, "orbit-hint");
      this.objects.empty = document.createElement("div");
      this.objects.empty.className = "empty-callout";
      this.objects.empty.innerHTML = "Patella prediction: <strong>empty</strong><br><span style=\"font:600 17px/1.25 var(--font-body)\">Retained in evaluation—not removed as an outlier.</span>";
      this.domLayer.append(this.objects.caseLabel, this.objects.stateLabel, this.objects.orbitHint, this.objects.empty);
      this.enableOrbit();
    }

    enableOrbit() {
      this.stage.classList.add("orbit-enabled");
      this.canvas.setAttribute("aria-label", "Drag horizontally or vertically to orbit the Fold-2 target and V-style prediction");
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let orbitX = 0;
      let orbitY = 0;

      const applyOrbit = () => {
        [this.objects.target, this.objects.prediction, this.objects.patellaDetail].forEach(group => {
          group.rotation.set(-Math.PI / 2 + orbitX, orbitY, -0.12);
        });
        this.renderOnce();
      };
      const start = event => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        this.stage.classList.add("orbiting");
        if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(event.pointerId);
      };
      const move = event => {
        if (!dragging) return;
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        orbitY += deltaX * 0.008;
        orbitX = Math.max(-0.9, Math.min(0.9, orbitX + deltaY * 0.008));
        applyOrbit();
      };
      const end = event => {
        if (!dragging) return;
        dragging = false;
        this.stage.classList.remove("orbiting");
        if (this.canvas.hasPointerCapture && this.canvas.hasPointerCapture(event.pointerId)) {
          this.canvas.releasePointerCapture(event.pointerId);
        }
      };
      this.canvas.addEventListener("pointerdown", start);
      this.canvas.addEventListener("pointermove", move);
      this.canvas.addEventListener("pointerup", end);
      this.canvas.addEventListener("pointercancel", end);
    }

    renderStep(step) {
      this.objects.target.visible = step === 0 || step === 2;
      this.objects.prediction.visible = step === 1 || step === 2;
      this.objects.patellaDetail.visible = step === 3;
      this.objects.stateLabel.textContent =
        step === 0 ? "Ground truth" :
        step === 1 ? "Held-out V-style prediction" :
        step === 2 ? "Target wireframe + prediction" :
        "Isolated patella failure";

      this.setBoneVisibility(this.objects.target, ["femur", "tibia", "patella", "fibula"]);
      this.setBoneVisibility(this.objects.prediction, ["femur", "tibia", "patella", "fibula"]);

      this.objects.target.children.forEach(child => {
        child.traverse(node => {
          if (node.isMesh) {
            node.material.opacity = step === 0 ? 0.68 : 0.24;
            node.material.wireframe = step !== 0;
          }
        });
      });
      this.objects.prediction.children.forEach(child => {
        child.traverse(node => {
          if (node.isMesh) node.material.opacity = step === 2 ? 0.72 : 0.94;
        });
      });

      this.objects.empty.classList.toggle("show", step === 3);
      const legend = this.slide.querySelector(".bone-legend");
      if (legend) legend.style.opacity = "1";
    }

    update() {}
  }

  register("bottlenecks", container => new BottleneckScene(container));
})();
