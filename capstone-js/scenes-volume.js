
(function () {
  "use strict";

  const { register, ThreeScene, assets, dataUriToImage, hexNumber } = window.CapstoneScenes;

  function label(text, style, className = "") {
    const element = document.createElement("div");
    element.className = `visual-label ${className}`;
    element.textContent = text;
    Object.assign(element.style, style);
    return element;
  }

  class LiftScene extends ThreeScene {
    async build() {
      const THREE = this.THREE;
      this.camera.position.set(7.3, 5.0, 8.8);
      this.camera.lookAt(0, 0, 0);
      const [apImage, latImage] = await Promise.all([dataUriToImage(assets.features[1].uri), dataUriToImage(assets.features[1].uri)]);
      const makeTexture = image => {
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        return texture;
      };
      const apMaterial = new THREE.MeshBasicMaterial({ map: makeTexture(apImage), color: 0x83a8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const latMaterial = new THREE.MeshBasicMaterial({ map: makeTexture(latImage), color: 0x70c4aa, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      this.objects.apPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), apMaterial);
      this.objects.apPlane.position.x = -3.0;
      this.objects.latPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), latMaterial);
      this.objects.latPlane.position.x = 3.0;
      this.objects.latPlane.rotation.y = Math.PI / 2;
      this.scene.add(this.objects.apPlane, this.objects.latPlane);

      this.objects.apSlices = new THREE.Group();
      this.objects.latSlices = new THREE.Group();
      for (let index = 0; index < 10; index += 1) {
        const apSlice = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 3.25), apMaterial.clone());
        apSlice.material.opacity = 0.15;
        apSlice.position.z = -1.6 + index * 0.355;
        this.objects.apSlices.add(apSlice);
        const latSlice = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 3.25), latMaterial.clone());
        latSlice.material.opacity = 0.15;
        latSlice.rotation.y = Math.PI / 2;
        latSlice.position.x = -1.6 + index * 0.355;
        this.objects.latSlices.add(latSlice);
      }
      this.objects.apSlices.visible = false;
      this.objects.latSlices.visible = false;
      this.scene.add(this.objects.apSlices, this.objects.latSlices);

      const volumeGeometry = new THREE.BoxGeometry(3.35, 3.35, 3.35);
      this.objects.volume = new THREE.Mesh(
        volumeGeometry,
        new THREE.MeshStandardMaterial({ color: 0x9a2d72, transparent: true, opacity: 0.16, roughness: 0.5 })
      );
      this.objects.volume.visible = false;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(volumeGeometry), new THREE.LineBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.5 }));
      this.objects.volume.add(edges);
      this.scene.add(this.objects.volume);

      this.objects.rays = new THREE.Group();
      const sources = [new THREE.Vector3(-5.2, 0, 0), new THREE.Vector3(0, 0, 5.2)];
      const detectorCorners = [
        [new THREE.Vector3(1.7, 1.7, 0), new THREE.Vector3(1.7, -1.7, 0), new THREE.Vector3(-1.7, 1.7, 0), new THREE.Vector3(-1.7, -1.7, 0)],
        [new THREE.Vector3(0, 1.7, 1.7), new THREE.Vector3(0, -1.7, 1.7), new THREE.Vector3(0, 1.7, -1.7), new THREE.Vector3(0, -1.7, -1.7)]
      ];
      sources.forEach((source, sourceIndex) => {
        detectorCorners[sourceIndex].forEach(corner => {
          const geometry = new THREE.BufferGeometry().setFromPoints([source, corner]);
          const material = new THREE.LineBasicMaterial({ color: 0x9a2d72, transparent: true, opacity: 0.72 });
          this.objects.rays.add(new THREE.Line(geometry, material));
        });
      });
      this.objects.rays.visible = false;
      this.scene.add(this.objects.rays);

      this.objects.apLabel = label("AP feature map", { left: "28px", top: "28px" });
      this.objects.latLabel = label("Flipped lateral feature map", { right: "28px", top: "28px" });
      this.objects.opLabel = label("flip → permute → unsqueeze → expand", { left: "50%", bottom: "30px", transform: "translateX(-50%)", opacity: "0" }, "dark-label");
      this.objects.constraintLabel = label("Finite-source rays are not traced by this lift", { left: "50%", bottom: "30px", transform: "translateX(-50%)", opacity: "0" }, "constraint-label");
      this.domLayer.append(this.objects.apLabel, this.objects.latLabel, this.objects.opLabel, this.objects.constraintLabel);
    }

    renderStep(step) {
      this.objects.apSlices.visible = step >= 1;
      this.objects.latSlices.visible = step >= 1;
      this.objects.volume.visible = step >= 2;
      this.objects.rays.visible = step >= 3;
      this.objects.opLabel.style.opacity = step === 1 || step === 2 ? "1" : "0";
      this.objects.constraintLabel.style.opacity = step === 3 ? "1" : "0";
      this.objects.apPlane.material.opacity = step >= 2 ? 0.3 : 0.9;
      this.objects.latPlane.material.opacity = step >= 2 ? 0.3 : 0.9;
    }

    update(delta) {
      if (this.step >= 2) this.objects.volume.rotation.y += delta * 0.12;
    }
  }

  class DecoderScene extends ThreeScene {
    async build() {
      const THREE = this.THREE;
      this.camera.position.set(5.4, 3.6, 7.4);
      this.camera.lookAt(0, 0.2, 0);
      this.objects.pipeline = document.createElement("div");
      this.objects.pipeline.innerHTML = `
        <div class="pipeline-axis"></div>
        <div class="pipeline-node" data-stage="0" style="left:4%">8³<br>512 ch</div>
        <div class="pipeline-node" data-stage="1" style="left:22%">16³<br>+ L2</div>
        <div class="pipeline-node" data-stage="2" style="left:40%">32³<br>+ L1</div>
        <div class="pipeline-node" data-stage="3" style="left:58%">64³<br>+ L0</div>
        <div class="pipeline-node" data-stage="4" style="left:76%">128³ logits<br>→ 256³</div>`;
      this.domLayer.appendChild(this.objects.pipeline);
      this.objects.nodes = [...this.objects.pipeline.querySelectorAll(".pipeline-node")];

      this.objects.bones = await this.createBoneGroup("successPrediction");
      this.normalizeGroups([this.objects.bones], 4.8);
      this.objects.bones.rotation.set(-Math.PI / 2, 0, -0.15);
      this.scene.add(this.objects.bones);
      this.centerGroupsAt([this.objects.bones], new THREE.Vector3(0, -0.2, 0));
      this.objects.bones.visible = false;

      this.objects.outputLabel = label("Residual-ReLU · VSD_005_Left · held out in fold 4", { left: "28px", top: "28px", opacity: "0" }, "dark-label");
      this.domLayer.append(this.objects.outputLabel);

      const legend = this.stage.querySelector(".bone-legend");
      if (legend) legend.style.opacity = "0";
      this.objects.legend = legend;
    }

    renderStep(step) {
      this.objects.nodes.forEach((node, index) => node.classList.toggle("active", index === Math.min(step, 4)));
      const final = step >= 4;
      this.objects.pipeline.style.opacity = final ? "0" : "1";
      this.objects.bones.visible = final;
      this.objects.outputLabel.style.opacity = final ? "1" : "0";
      if (this.objects.legend) this.objects.legend.style.opacity = final ? "1" : "0";
      if (final) this.setBoneVisibility(this.objects.bones, ["femur", "tibia", "patella", "fibula"]);
    }

    update() {}
  }

  class ResidualScene extends ThreeScene {
    async build() {
      const THREE = this.THREE;
      this.camera.position.set(5.2, 3.2, 7.2);
      this.camera.lookAt(0, 0, 0);
      this.objects.lane = document.createElement("div");
      this.objects.lane.className = "residual-lane";
      this.objects.lane.innerHTML = `
        <div class="block-node">Input feature</div>
        <div class="block-node">3×3×3 Conv<br>GroupNorm<br>Activation</div>
        <div class="block-node">3×3×3 Conv<br>GroupNorm</div>
        <div class="block-node">Add</div>
        <div class="block-node">Activation</div>
        <div class="residual-bypass"></div>`;
      this.domLayer.appendChild(this.objects.lane);
      this.objects.bypass = this.objects.lane.querySelector(".residual-bypass");
      this.objects.nodes = [...this.objects.lane.querySelectorAll(".block-node")];

      const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8, 6, 6, 6);
      const material = new THREE.MeshStandardMaterial({ color: 0x1457d9, transparent: true, opacity: 0.12, wireframe: true });
      this.objects.feature = new THREE.Mesh(geometry, material);
      this.objects.feature.position.set(0, -1.75, -0.4);
      this.objects.feature.visible = false;
      this.scene.add(this.objects.feature);

      this.objects.modeLabel = label("Plain block: only the refinement path", { left: "50%", bottom: "30px", transform: "translateX(-50%)" });
      this.domLayer.append(this.objects.modeLabel);
    }

    renderStep(step) {
      this.objects.nodes.forEach((node, index) => node.classList.toggle("active", index <= step));
      const residual = step >= 2;
      this.objects.bypass.classList.toggle("active", residual);
      this.objects.modeLabel.textContent = residual
        ? "Projected residual: preserve the coarse signal, then add refinement"
        : step === 1
          ? "Two matched 3D convolutions refine the same input"
          : "Plain block: only the refinement path";
      this.objects.feature.visible = step >= 3;
      this.objects.feature.material.opacity = step >= 3 ? 0.38 : 0.12;
    }

    update(delta) {
      if (this.objects.feature.visible) {
        this.objects.feature.rotation.x += delta * 0.1;
        this.objects.feature.rotation.y += delta * 0.16;
      }
    }
  }

  register("lift", container => new LiftScene(container));
  register("decoder", container => new DecoderScene(container));
  register("residual", container => new ResidualScene(container));
})();

