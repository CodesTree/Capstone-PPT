
(function () {
  "use strict";

  const { register, ThreeScene, assets, dataUriToImage, hexNumber } = window.CapstoneScenes;

  function makeLabel(className, text, style) {
    const element = document.createElement("div");
    element.className = `visual-label ${className || ""}`;
    element.textContent = text;
    Object.assign(element.style, style || {});
    return element;
  }

  class P1Scene extends ThreeScene {
    async build() {
      const THREE = this.THREE;
      this.camera.position.set(5.6, 3.4, 7.2);
      this.camera.lookAt(0, 0, 0);

      const image = document.createElement("div");
      image.className = "drr-panel";
      Object.assign(image.style, { left: "45px", top: "74px", width: "420px", height: "560px" });
      image.innerHTML = `<img alt="Actual AP digitally reconstructed radiograph"><div class="patch-grid"></div>`;
      image.querySelector("img").src = assets.drr.ap;
      const grid = image.querySelector(".patch-grid");
      const masked = new Set(Array.from({ length: 38 }, (_, index) => (index * 17 + 5) % 64));
      for (let index = 0; index < 64; index += 1) {
        const cell = document.createElement("span");
        cell.className = "patch-cell";
        if (masked.has(index)) cell.dataset.masked = "true";
        grid.appendChild(cell);
      }
      this.domLayer.appendChild(image);
      this.objects.image = image;
      this.objects.grid = grid;

      this.objects.inputLabel = makeLabel("", "Actual AP DRR", { left: "44px", top: "24px" });
      this.domLayer.appendChild(this.objects.inputLabel);
      this.objects.maskLabel = makeLabel("", "38 of 64 patches hidden", { left: "44px", bottom: "27px", opacity: "0" });
      this.domLayer.appendChild(this.objects.maskLabel);

      const sizes = [1.75, 1.35, 1.0, 0.72];
      const colors = [0x1457d9, 0xf28c28, 0x187b61, 0xff3300];
      this.objects.blocks = [];
      sizes.forEach((size, index) => {
        const geometry = new THREE.BoxGeometry(size, size, 0.22);
        const material = new THREE.MeshStandardMaterial({
          color: colors[index],
          transparent: true,
          opacity: 0.1,
          roughness: 0.7
        });
        const block = new THREE.Mesh(geometry, material);
        block.position.set(1.2 + index * 0.9, 1.55 - index * 0.85, 0);
        block.rotation.set(-0.12, 0.42, -0.05);
        block.visible = false;
        this.scene.add(block);
        this.objects.blocks.push(block);
      });

      this.objects.featureLabel = makeLabel("dark-label", "ConvNeXt feature pyramid", { right: "40px", top: "28px", opacity: "0" });
      this.objects.outputLabel = makeLabel("", "Predict only the missing patches", { right: "40px", bottom: "28px", opacity: "0" });
      this.domLayer.append(this.objects.featureLabel, this.objects.outputLabel);
    }

    renderStep(step) {
      const cells = [...this.objects.grid.children];
      this.objects.image.style.left = step === 0 ? "350px" : "45px";
      this.objects.inputLabel.style.left = step === 0 ? "349px" : "44px";
      this.objects.grid.style.opacity = step >= 1 ? "1" : "0";
      cells.forEach(cell => cell.classList.toggle("masked", step >= 1 && cell.dataset.masked === "true"));
      this.objects.maskLabel.style.opacity = step >= 1 ? "1" : "0";
      this.objects.blocks.forEach((block, index) => {
        block.visible = step >= 2;
        block.material.opacity = step >= 2 ? 0.74 - index * 0.08 : 0.1;
      });
      this.objects.featureLabel.style.opacity = step >= 2 ? "1" : "0";
      this.objects.outputLabel.style.opacity = step >= 3 ? "1" : "0";
      if (step >= 3) {
        cells.forEach(cell => {
          if (cell.dataset.masked === "true") cell.style.background = "rgba(24,123,97,.28)";
        });
      } else {
        cells.forEach(cell => { cell.style.background = ""; });
      }
    }

    update(delta) {
      if (this.step >= 2) {
        this.objects.blocks.forEach((block, index) => {
          block.rotation.y += delta * (0.12 + index * 0.025);
        });
      }
    }
  }

  class P2Scene extends ThreeScene {
    async build() {
      const THREE = this.THREE;
      this.camera.position.set(6.4, 4.4, 7.6);
      this.camera.lookAt(0, 0, 0);
      const [apImage, latImage] = await Promise.all([dataUriToImage(assets.drr.ap), dataUriToImage(assets.drr.lat)]);
      const createPlane = (image, color, rotationY, x) => {
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 3.45), material);
        plane.rotation.y = rotationY;
        plane.position.x = x;
        const border = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.55, 3.55)),
          new THREE.LineBasicMaterial({ color, linewidth: 2 })
        );
        border.rotation.copy(plane.rotation);
        border.position.copy(plane.position);
        this.scene.add(plane, border);
        return { plane, border };
      };
      this.objects.ap = createPlane(apImage, 0x1457d9, 0, -1.85);
      this.objects.lat = createPlane(latImage, 0x187b61, Math.PI / 2, 1.85);

      this.objects.lines = new THREE.Group();
      for (let row = 0; row < 8; row += 1) {
        for (let delta = -1; delta <= 1; delta += 1) {
          const target = row + delta;
          if (target < 0 || target >= 8) continue;
          const y1 = 1.5 - row * (3 / 7);
          const y2 = 1.5 - target * (3 / 7);
          const points = [
            new THREE.Vector3(-1.75, y1, 0.15),
            new THREE.Vector3(0, (y1 + y2) / 2, 0.85 + delta * 0.08),
            new THREE.Vector3(1.75, y2, 0.15)
          ];
          const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
          const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(18));
          const material = new THREE.LineBasicMaterial({
            color: delta === 0 ? 0x1457d9 : 0x187b61,
            transparent: true,
            opacity: delta === 0 ? 0.58 : 0.26
          });
          this.objects.lines.add(new THREE.Line(geometry, material));
        }
      }
      this.objects.lines.visible = false;
      this.scene.add(this.objects.lines);

      this.objects.apLabel = makeLabel("", "AP view", { left: "36px", top: "28px" });
      this.objects.latLabel = makeLabel("", "Lateral view", { right: "34px", top: "28px" });
      this.objects.allowedLabel = makeLabel("dark-label", "Allowed: same or adjacent patch row", { left: "50%", bottom: "28px", transform: "translateX(-50%)", opacity: "0" });
      this.objects.directionLabel = makeLabel("", "AP ⇄ LAT completion", { left: "50%", top: "28px", transform: "translateX(-50%)", opacity: "0" });
      this.domLayer.append(this.objects.apLabel, this.objects.latLabel, this.objects.allowedLabel, this.objects.directionLabel);
    }

    renderStep(step) {
      this.objects.lines.visible = step >= 2;
      this.objects.allowedLabel.style.opacity = step >= 2 ? "1" : "0";
      this.objects.directionLabel.style.opacity = step >= 1 ? "1" : "0";
      this.objects.ap.plane.material.opacity = step === 3 ? 0.78 : 0.92;
      this.objects.lat.plane.material.opacity = step === 3 ? 0.78 : 0.92;
      this.objects.lines.children.forEach((line, index) => {
        line.material.opacity = step >= 3 ? 0.7 - (index % 3) * 0.14 : 0.42 - (index % 3) * 0.08;
      });
    }

    update(delta) {
      if (this.step >= 1) {
        this.objects.lines.rotation.y = Math.sin(performance.now() / 1800) * 0.04;
      }
    }
  }

  class FeatureScene extends ThreeScene {
    async build() {
      const THREE = this.THREE;
      this.camera.position.set(6.6, 4.2, 8.4);
      this.camera.lookAt(0, 0, 0);
      const positions = [-3.3, -1.15, 1.15, 3.3];
      const sizes = [2.4, 1.9, 1.45, 1.05];
      const targetChannels = [64, 128, 256, 512];
      const labels = ["64² × 96", "32² × 192", "16² × 384", "8² × 768"];
      this.objects.levels = [];

      for (let index = 0; index < assets.features.length; index += 1) {
        const item = assets.features[index];
        const image = await dataUriToImage(item.uri);
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        const geometry = new THREE.BoxGeometry(sizes[index], sizes[index], 0.34 + index * 0.08);
        const materials = [
          new THREE.MeshStandardMaterial({ color: 0xe5e5dc, roughness: 0.72 }),
          new THREE.MeshStandardMaterial({ color: 0xe5e5dc, roughness: 0.72 }),
          new THREE.MeshStandardMaterial({ color: 0xe5e5dc, roughness: 0.72 }),
          new THREE.MeshStandardMaterial({ color: 0xe5e5dc, roughness: 0.72 }),
          new THREE.MeshBasicMaterial({ map: texture }),
          new THREE.MeshBasicMaterial({ map: texture })
        ];
        const cube = new THREE.Mesh(geometry, materials);
        cube.position.set(positions[index], 0.25, 0);
        cube.rotation.set(-0.16, 0.24, -0.03);
        cube.userData.targetChannels = targetChannels[index];
        this.scene.add(cube);
        const label = makeLabel("", labels[index], {
          left: `${13 + index * 24}%`,
          top: `${index % 2 === 0 ? 10 : 16}%`,
          transform: "translateX(-50%)"
        });
        const method = makeLabel(index < 2 ? "" : "dark-label", index < 2 ? "Local fusion" : "Cross-attention", {
          left: `${13 + index * 24}%`,
          bottom: "42px",
          transform: "translateX(-50%)",
          opacity: "0"
        });
        this.domLayer.append(label, method);
        this.objects.levels.push({ cube, label, method });
      }
      this.objects.projection = makeLabel("constraint-label", "1×1 projection → 64 · 128 · 256 · 512 channels", {
        left: "50%", bottom: "30px", transform: "translateX(-50%)", opacity: "0"
      });
      this.domLayer.append(this.objects.projection);
    }

    renderStep(step) {
      this.objects.levels.forEach((level, index) => {
        const highResolution = index < 2;
        level.method.style.opacity = (step === 1 && highResolution) || (step === 2 && !highResolution) ? "1" : "0";
        level.cube.material.forEach(material => {
          material.transparent = true;
          material.opacity = step === 0 || step === 3 || (step === 1 && highResolution) || (step === 2 && !highResolution) ? 1 : 0.22;
        });
        level.cube.position.y = step === 3 ? (index - 1.5) * 0.28 : 0.25;
      });
      this.objects.projection.style.opacity = step === 3 ? "1" : "0";
    }

    update(delta) {
      this.objects.levels.forEach((level, index) => {
        level.cube.rotation.y += delta * (0.08 + index * 0.025);
      });
    }
  }

  register("p1", container => new P1Scene(container));
  register("p2", container => new P2Scene(container));
  register("features", container => new FeatureScene(container));
})();

