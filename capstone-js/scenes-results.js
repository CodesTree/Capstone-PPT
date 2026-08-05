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
      this.camera.position.set(0, 2.2, 9.4);
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
    leftLabel: "All predicted channels · VSD_005_Left",
    rightLabel: "Small-bone detail",
    rightBones: ["patella", "fibula"]
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