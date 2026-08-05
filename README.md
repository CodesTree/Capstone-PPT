# Capstone presentation

Open `capstone-presentation.html` directly in Chrome or Edge. The deck is a fixed 1920 × 1080 presentation with 27 slides.

- Use the arrow keys or mouse wheel to move between slides.
- On modelling slides, click the visual or **Next step** to reveal the next concept.
- Press `E` to edit text. Edits use stable `data-edit-id` keys and migrate existing v1 browser edits.
- Reliable Wi-Fi is required because Three.js 0.185.1 and its GLTF loader are loaded from jsDelivr. No Three.js package is bundled locally.
- If the CDN or WebGL fails, each scene shows a restrained textual fallback.

## Bone palette

All bone-coded materials, legends and metric bars use one mapping:

- Femur: `#1457D9`
- Tibia: `#F28C28`
- Patella: `#187B61`
- Fibula: `#FF3300`

The model channel order remains femur, tibia, patella, fibula.

## Regenerate authentic assets

Use the project virtual environment so `torch`, `timm`, `nibabel`, `scikit-image` and `trimesh` are available:

```powershell
& "C:\Users\Chan Zheng Shao\OneDrive\Desktop\Github Repo\TestProject\TestProject\.venv\Scripts\python.exe" `
  .\tools\build_modeling_assets.py `
  --project-root "C:\Users\Chan Zheng Shao\OneDrive\Desktop\Github Repo\TestProject\TestProject" `
  --output .\capstone-assets\modeling
```

The command exports actual AP/LAT DRRs, fold-4 RMS feature-energy maps, optimized GLB geometry embedded in `model-assets.js`, and a provenance manifest containing cases, folds, decoder arms, spacing, hashes and transformations.

## Validate

```powershell
python .\tools\validate_modeling_assets.py
node --check .\capstone-js\deck-controller.js
node --check .\capstone-js\modeling-runtime.js
```

For full browser QA, start a local server and run the Playwright renderer:

```powershell
python -m http.server 8765 --bind 127.0.0.1
node .\tools\qa_deck.js http://127.0.0.1:8765/capstone-presentation.html .\qa-renders
```

The browser test renders every slide and every click state at 1920 × 1080, reports clipping and runtime errors, and confirms that no local GLB/GLTF/JSON fetches occur.