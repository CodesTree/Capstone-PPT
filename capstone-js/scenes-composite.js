(function () {
  "use strict";
  const { register, ThreeScene } = window.CapstoneScenes;

  const SCENES = {
    "representation-learning": [
      ["AP DRR", "LAT DRR"],
      ["Masked patches", "Single-view encoder"],
      ["AP → LAT", "LAT → AP"],
      ["Crop", "Noise", "Intensity"]
    ],
    "shared-front-end": [
      ["64×64", "32×32", "16×16", "8×8"],
      ["AP features", "+", "LAT features"],
      ["2D features", "Cartesian lift", "3D volume"],
      ["Approximate geometry", "Test ray-aware lift"]
    ],
    "decoder-architecture": [
      ["Lifted volume", "Upsample", "Four channels"],
      ["Conv", "Activation", "Conv"],
      ["Identity path", "+", "Refinement"],
      ["Plain–ReLU", "Plain–PReLU", "Residual–ReLU", "Residual–PReLU"]
    ]
  };

  class CompositeScene extends ThreeScene {
    constructor(container, name) {
      super(container);
      this.name = name;
    }
    async build() {
      this.camera.position.set(0, 0, 8);
      this.camera.lookAt(0, 0, 0);
      this.domLayer.classList.add("composite-scene");
      SCENES[this.name].forEach((labels, index) => {
        const row = document.createElement("div");
        row.className = "composite-row";
        row.dataset.compositeStep = String(index);
        labels.forEach((label, labelIndex) => {
          const item = document.createElement("div");
          item.className = "composite-node";
          item.textContent = label;
          row.appendChild(item);
          if (labelIndex < labels.length - 1) {
            const arrow = document.createElement("span");
            arrow.className = "composite-arrow";
            arrow.textContent = "→";
            row.appendChild(arrow);
          }
        });
        this.domLayer.appendChild(row);
      });
    }
    renderStep(step) {
      this.domLayer.querySelectorAll("[data-composite-step]").forEach((row, index) => {
        row.classList.toggle("active", index === step);
      });
    }
    update() {}
  }

  Object.keys(SCENES).forEach(name => register(name, container => new CompositeScene(container, name)));
})();
