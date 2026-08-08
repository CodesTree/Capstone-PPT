
(function () {
  "use strict";

  const registry = new Map();
  const instances = new Map();
  const assets = window.CapstoneModelAssets;

  if (!assets) throw new Error("CapstoneModelAssets must load before modeling-runtime.js");

  const palette = Object.freeze({ ...assets.palette });
  const boneOrder = Object.freeze([...assets.boneOrder]);

  function base64ToArrayBuffer(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }

  function dataUriToImage(uri) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = uri;
    });
  }

  function hexNumber(value) {
    return Number.parseInt(value.replace("#", ""), 16);
  }

  function loadGlb(loader, payload) {
    if (!payload) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      loader.parse(base64ToArrayBuffer(payload), "", gltf => resolve(gltf.scene), reject);
    });
  }

  class ThreeScene {
    constructor(container, options = {}) {
      this.container = container;
      this.stage = container.closest(".model-stage");
      this.slide = container.closest(".slide") || container.closest(".demo-overlay");
      this.canvas = this.stage.querySelector("canvas");
      this.domLayer = this.stage.querySelector(".model-dom-layer");
      this.loading = this.stage.querySelector(".model-loading");
      this.fallback = this.stage.querySelector(".model-fallback");
      this.panels = [...this.slide.querySelectorAll("[data-step-panel]")];
      this.dotsRoot = this.slide.querySelector(".model-progress-dots");
      this.nextButton = this.slide.querySelector(".model-next");
      this.options = options;
      this.step = 0;
      this.active = false;
      this.ready = false;
      this.frame = null;
      this.clock = null;
      this.objects = {};
      this.setupProgress();
      this.bindControls();
    }

    setupProgress() {
      if (!this.dotsRoot) return;
      this.dotsRoot.innerHTML = "";
      this.panels.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.className = "model-progress-dot";
        dot.setAttribute("aria-label", `Step ${index + 1}`);
        this.dotsRoot.appendChild(dot);
      });
    }

    bindControls() {
      const advance = event => {
        event.preventDefault();
        event.stopPropagation();
        this.nextStep();
      };
      if (this.nextButton) this.nextButton.addEventListener("click", advance);
      this.stage.addEventListener("click", event => {
        if (event.target.closest(".model-next")) return;
        if (this.stage.classList.contains("orbit-enabled")) return;
        advance(event);
      });
    }

    async mount() {
      try {
        const runtime = await window.ThreeRuntimeReady;
        this.THREE = runtime.THREE;
        this.GLTFLoader = runtime.GLTFLoader;
        const THREE = this.THREE;
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        this.camera.position.set(4.8, 3.1, 6.8);
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 2.4));
        const key = new THREE.DirectionalLight(0xffffff, 3.1);
        key.position.set(4, 7, 5);
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0xffd8c7, 1.2);
        rim.position.set(-5, 2, -4);
        this.scene.add(rim);
        this.clock = new THREE.Clock();
        if (window.ResizeObserver) {
          this.resizeObserver = new ResizeObserver(() => this.resize());
          this.resizeObserver.observe(this.stage);
        }
        await this.build();
        this.resize();
        this.ready = true;
        this.stage.classList.add("ready");
        this.reset();
        if (this.active) this.startLoop();
      } catch (error) {
        console.error("Model scene failed:", error);
        this.stage.classList.add("failed");
        if (this.fallback) this.fallback.textContent = "Interactive model unavailable. The slide text and source evidence remain valid.";
      }
    }

    async build() {}

    update() {}

    renderStep() {}

    setStep(next) {
      const maximum = Math.max(0, this.panels.length - 1);
      this.step = Math.max(0, Math.min(next, maximum));
      this.panels.forEach((panel, index) => panel.classList.toggle("active", index === this.step));
      if (this.dotsRoot) {
        [...this.dotsRoot.children].forEach((dot, index) => dot.classList.toggle("active", index === this.step));
      }
      if (this.nextButton) {
        const done = this.step === maximum;
        this.nextButton.classList.toggle("done", done);
        this.nextButton.textContent = done ? "Restart" : "Next step";
      }
      this.renderStep(this.step);
      this.renderOnce();
    }

    nextStep() {
      if (!this.ready) return;
      const maximum = Math.max(0, this.panels.length - 1);
      this.setStep(this.step >= maximum ? 0 : this.step + 1);
    }

    reset() {
      if (!this.ready) return;
      this.setStep(0);
    }

    activate() {
      this.active = true;
      this.reset();
      this.startLoop();
    }

    deactivate() {
      this.active = false;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = null;
    }

    startLoop() {
      if (!this.ready || !this.active || this.frame) return;
      const loop = () => {
        if (!this.active) {
          this.frame = null;
          return;
        }
        const delta = this.clock ? this.clock.getDelta() : 0;
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
        this.frame = requestAnimationFrame(loop);
      };
      loop();
    }

    renderOnce() {
      if (this.ready && this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }

    resize() {
      if (!this.renderer) return;
      const rect = this.stage.getBoundingClientRect();
      const deck = this.stage.closest("#deckStage");
      const deckRect = deck?.getBoundingClientRect();
      const scale = deckRect?.width ? deckRect.width / 1920 : (rect.width / this.stage.offsetWidth || 1);
      const width = Math.max(1, this.stage.clientWidth || Math.round(rect.width / scale));
      const height = Math.max(1, this.stage.clientHeight || Math.round(rect.height / scale));
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderOnce();
    }

    dispose() {
      this.deactivate();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (!this.scene) return;
      this.scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      this.renderer.dispose();
    }

    async createBoneGroup(groupKey, options = {}) {
      const THREE = this.THREE;
      const loader = new this.GLTFLoader();
      const group = new THREE.Group();
      group.name = groupKey;
      for (const bone of boneOrder) {
        const payload = assets.meshes[groupKey][bone];
        const object = await loadGlb(loader, payload);
        if (!object) {
          group.userData[`${bone}Empty`] = true;
          continue;
        }
        object.name = bone;
        object.userData.bone = bone;
        const material = new THREE.MeshStandardMaterial({
          color: hexNumber(palette[bone]),
          roughness: 0.58,
          metalness: 0.02,
          transparent: options.opacity !== undefined && options.opacity < 1,
          opacity: options.opacity === undefined ? 1 : options.opacity,
          wireframe: Boolean(options.wireframe),
          depthWrite: options.opacity === undefined || options.opacity >= 1
        });
        object.traverse(child => {
          if (child.isMesh) {
            child.material = material;
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        group.add(object);
      }
      return group;
    }

    normalizeGroups(groups, targetSize = 4.8) {
      const THREE = this.THREE;
      const box = new THREE.Box3();
      groups.forEach(group => box.expandByObject(group));
      const size = box.getSize(new THREE.Vector3());
      const scale = targetSize / Math.max(size.x, size.y, size.z, 1e-6);
      groups.forEach(group => group.scale.setScalar(scale));
    }

    centerGroupsAt(groups, target = new this.THREE.Vector3()) {
      const THREE = this.THREE;
      groups.forEach(group => group.updateWorldMatrix(true, true));
      const box = new THREE.Box3();
      groups.forEach(group => box.expandByObject(group));
      const center = box.getCenter(new THREE.Vector3());
      const delta = target.clone().sub(center);
      groups.forEach(group => group.position.add(delta));
    }

    setBoneVisibility(group, visibleBones) {
      if (!group) return;
      group.children.forEach(child => { child.visible = visibleBones.includes(child.name); });
    }
  }

  function register(name, factory) {
    if (registry.has(name)) throw new Error(`Duplicate scene registration: ${name}`);
    registry.set(name, factory);
  }

  async function initialize() {
    document.querySelectorAll("[data-visual]").forEach(container => {
      const name = container.dataset.visual;
      const factory = registry.get(name);
      if (!factory) {
        console.error(`No scene registered for ${name}`);
        return;
      }
      const instance = factory(container);
      instances.set(container, instance);
      instance.mount();
    });
    const active = document.querySelector(".slide.active [data-visual]");
    if (active && instances.has(active)) instances.get(active).activate();
  }

  window.addEventListener("deck:slidechange", event => {
    instances.forEach((instance, container) => {
      const active = container.closest(".slide") === event.detail.slide;
      if (active) instance.activate();
      else instance.deactivate();
    });
  });
  window.addEventListener("deck:demochange", event => {
    instances.forEach((instance, container) => {
      if (!container.closest(".demo-overlay")) return;
      if (event.detail.open && (event.detail.state === undefined || event.detail.state === 1)) {
        instance.resize();
        instance.activate();
      }
      else instance.deactivate();
    });
  });
  window.addEventListener("deck:resize", () => instances.forEach(instance => instance.resize()));
  window.addEventListener("beforeunload", () => instances.forEach(instance => instance.dispose()));

  window.CapstoneScenes = {
    register,
    ThreeScene,
    palette,
    boneOrder,
    assets,
    dataUriToImage,
    hexNumber
  };

  window.addEventListener("DOMContentLoaded", initialize);
})();

