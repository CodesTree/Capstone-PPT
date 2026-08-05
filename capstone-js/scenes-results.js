(function () {
  "use strict";

  const { register, ThreeScene } = window.CapstoneScenes;

  function label(text, style, extraClass = "") {
    const element = document.createElement("div");
    element.className = "visual-label " + extraClass;
    element.textContent = text;
    Object.assign(element.style, style);
    return element;
  }

  class ComparisonScene extends ThreeScene {
    constructor(container, configuration) {
      super(container);
      this.configuration = configuration;
    }

    async build() {
      this.camera.position.set(0, 2.2, this.configuration.cameraZ || 9.4);
      this.camera.lookAt(0, 0, 0);
      this.objects.left = await this.createBoneGroup(this.configuration.left, {
        opacity: this.configuration.leftOpacity || 1,
        wireframe: Boolean(this.configuration.leftWireframe)
      });
      this.objects.right = await this.createBoneGroup(this.configuration.right, {
        opacity: this.configuration.rightOpacity || 1
      });
      if (this.configuration.rightBones) {
        this.setBoneVisibility(this.objects.right, this.configuration.rightBones);
      }
      this.normalizeGroups([this.objects.left], 3.85);
      this.normalizeGroups([this.objects.right], 3.85);
      [this.objects.left, this.objects.right].forEach(group => {
        group.rotation.set(-Math.PI / 2, 0, -0.12);
        this.scene.add(group);
      });
      this.centerGroupsAt([this.objects.left], new this.THREE.Vector3(-2.15, -0.25, 0));
      this.centerGroupsAt([this.objects.right], new this.THREE.Vector3(2.15, -0.25, 0));

      const leftLabel = label(this.configuration.leftLabel, { left: "24px", top: "22px" }, "dark-label");
      const rightLabel = label(this.configuration.rightLabel, { right: "24px", top: "22px" });
      this.domLayer.append(leftLabel, rightLabel);
      if (this.configuration.emptyText) {
        const empty = document.createElement("div");
        empty.className = "empty-callout show result-empty-callout";
        empty.innerHTML = this.configuration.emptyText;
        this.domLayer.append(empty);
      }
      if (this.configuration.orbit) {
        this.domLayer.append(label("Drag to orbit", { left: "24px", bottom: "22px" }, "orbit-hint"));
        this.enableOrbit();
      }
    }

    enableOrbit() {
      this.stage.classList.add("orbit-enabled");
      this.canvas.setAttribute("aria-label", "Drag horizontally or vertically to orbit the 3D bone comparison");
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let orbitX = 0;
      let orbitY = 0;

      const applyOrbit = () => {
        [this.objects.left, this.objects.right].forEach(group => {
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

    renderStep() {
      this.objects.left.visible = true;
      this.objects.right.visible = true;
    }

    update() {}
  }

  register("success-comparison", container => new ComparisonScene(container, {
    left: "successPrediction",
    right: "successPrediction",
    leftLabel: "All channels",
    rightLabel: "Small bones",
    cameraZ: 16,
    rightBones: ["patella", "fibula"],
    orbit: true
  }));

  register("failure-comparison", container => new ComparisonScene(container, {
    left: "failureTarget",
    right: "failurePrediction",
    leftLabel: "Target · VSD_z023_Left",
    rightLabel: "Held-out V-style prediction",
    leftOpacity: 0.42,
    leftWireframe: true,
    emptyText: "Patella prediction: <strong>empty</strong>"
  }));
})();