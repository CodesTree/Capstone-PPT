
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
      this.camera.position.set(5.6, 3.8, 7.8);
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

      this.objects.caseLabel = callout("VSD_z023_Left · held-out V-style prediction", { left: "26px", top: "26px" }, "dark-label");
      this.objects.stateLabel = callout("Ground truth", { right: "26px", top: "26px" });
      this.objects.empty = document.createElement("div");
      this.objects.empty.className = "empty-callout";
      this.objects.empty.innerHTML = "Patella prediction: <strong>empty</strong><br><span style=\"font:600 17px/1.25 var(--font-body)\">The failure remains in the evaluation; it is not removed as an outlier.</span>";
      this.objects.constraints = [
        callout("Depth was lost in projection", { left: "24px", bottom: "24px", opacity: "0" }, "constraint-label"),
        callout("Deepest grid: 8 × 8", { left: "29%", bottom: "24px", opacity: "0" }, "constraint-label"),
        callout("Cartesian lift ≠ finite rays", { left: "49%", bottom: "24px", opacity: "0" }, "constraint-label"),
        callout("128³ logits → 256³", { right: "24px", bottom: "24px", opacity: "0" }, "constraint-label")
      ];
      this.domLayer.append(this.objects.caseLabel, this.objects.stateLabel, this.objects.empty, ...this.objects.constraints);
    }

    renderStep(step) {
      this.objects.target.visible = step === 0 || step === 2 || step >= 4;
      this.objects.prediction.visible = step === 1 || step === 2 || step >= 4;
      this.objects.patellaDetail.visible = step === 3;
      this.objects.stateLabel.textContent =
        step === 0 ? "Ground truth" :
        step === 1 ? "Prediction" :
        step === 2 ? "Overlay: target wireframe + prediction" :
        step === 3 ? "Isolated patella failure" :
        "Known constraints + plausible bottleneck";

      this.setBoneVisibility(this.objects.target, ["femur", "tibia", "patella", "fibula"]);
      this.setBoneVisibility(this.objects.prediction, ["femur", "tibia", "patella", "fibula"]);

      this.objects.target.children.forEach(child => {
        child.traverse(node => {
          if (node.isMesh) {
            node.material.opacity = step === 0 || step === 3 ? 0.68 : 0.24;
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
      this.objects.constraints.forEach(element => { element.style.opacity = step >= 4 ? "1" : "0"; });
      const legend = this.slide.querySelector(".bone-legend");
      if (legend) legend.style.opacity = step >= 4 ? "0" : "1";
    }

    update() {}
  }

  register("bottlenecks", container => new BottleneckScene(container));
})();

