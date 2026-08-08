from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "capstone-assets" / "modeling" / "model-assets-manifest.json"
HTML_PATH = ROOT / "capstone-presentation.html"
CSS_PATH = ROOT / "capstone-css" / "modeling-scenes.css"
RUNTIME_PATH = ROOT / "capstone-js" / "modeling-runtime.js"

EXPECTED_ORDER = ["femur", "tibia", "patella", "fibula"]
EXPECTED_PALETTE = {
    "femur": "#1457D9",
    "tibia": "#F28C28",
    "patella": "#187B61",
    "fibula": "#FF3300",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_component(group: str, bone: str, component: dict, allow_empty: bool = False) -> None:
    empty = bool(component.get("empty_prediction", False))
    if allow_empty and empty:
        require(component["vertices"] == 0 and component["faces"] == 0, f"{group}.{bone} empty mesh has geometry")
        require(component["bounds_mm"] is None and component["centroid_mm"] is None, f"{group}.{bone} empty mesh has spatial metadata")
        return

    require(not empty, f"{group}.{bone} is unexpectedly empty")
    require(component["vertices"] > 0 and component["faces"] > 0, f"{group}.{bone} has no mesh")
    bounds = component["bounds_mm"]
    centroid = component["centroid_mm"]
    require(len(bounds) == 2 and all(len(row) == 3 for row in bounds), f"{group}.{bone} invalid bounds")
    require(len(centroid) == 3, f"{group}.{bone} invalid centroid")
    for axis in range(3):
        require(bounds[0][axis] < bounds[1][axis], f"{group}.{bone} non-positive dimension on axis {axis}")
        require(bounds[0][axis] <= centroid[axis] <= bounds[1][axis], f"{group}.{bone} centroid outside bounds")


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    html = HTML_PATH.read_text(encoding="utf-8")
    css = CSS_PATH.read_text(encoding="utf-8")
    runtime = RUNTIME_PATH.read_text(encoding="utf-8")

    require(manifest["bone_order"] == EXPECTED_ORDER, "Model channel order changed")
    require(manifest["palette"] == EXPECTED_PALETTE, "Manifest bone palette changed")
    require(manifest["spacing_mm"] == [0.78125, 0.78125, 0.78125], "Unexpected mesh spacing")
    require(manifest["success_prediction"]["case"] == "VSD_005_Left", "Wrong success case")
    require(manifest["success_prediction"]["fold"] == 4, "Wrong success fold")
    require(manifest["failure_prediction"]["case"] == "VSD_z023_Left", "Wrong failure case")
    require(manifest["failure_prediction"]["fold"] == 2, "Wrong failure fold")

    for group in ("successPrediction", "failureTarget"):
        for bone in EXPECTED_ORDER:
            validate_component(group, bone, manifest[group]["bones"][bone])

    for bone in EXPECTED_ORDER:
        validate_component(
            "failurePrediction",
            bone,
            manifest["failurePrediction"]["bones"][bone],
            allow_empty=(bone == "patella"),
        )
    require(manifest["failurePrediction"]["bones"]["patella"]["empty_prediction"], "Failure patella should be empty")

    css_expected = {
        "--bone-femur": "#1457D9",
        "--bone-tibia": "#F28C28",
        "--bone-patella": "#187B61",
        "--bone-fibula": "#FF3300",
    }
    for token, value in css_expected.items():
        require(re.search(rf"{re.escape(token)}:\s*{re.escape(value)}\s*;", css, re.IGNORECASE) is not None, f"Missing CSS palette token {token}")

    require("color: hexNumber(palette[bone])" in runtime, "Three.js materials do not use the central palette")
    slide_tags = re.findall(r'<section\b[^>]*\bclass="[^"]*\bslide\b[^"]*"[^>]*>', html, re.DOTALL)
    total_slides = len(slide_tags)
    core_slides = sum('data-route="core"' in tag for tag in slide_tags)
    qa_slides = sum('data-route="qa"' in tag for tag in slide_tags)
    require(all(re.search(r'\bid="[^"]+"', tag) and 'data-route=' in tag for tag in slide_tags), "Every slide needs an id and route")
    require(total_slides == 30, "Deck does not contain 30 total slides")
    require(core_slides == 17, "Deck does not contain 17 core slides")
    require(qa_slides == 13, "Deck does not contain 13 Q&A slides")
    require(len(re.findall(r'data-visual="', html)) == 8, "Deck does not contain 8 active 3D visuals")
    require('three@0.185.1/build/three.module.min.js' in html, "Pinned Three.js CDN import missing")
    require('three@0.185.1/examples/jsm/' in html, "Pinned Three.js addons import missing")
    require(not re.search(r'src="[^"]*(?:three(?:\.min)?\.js|three\.module)', html, re.IGNORECASE), "Three.js appears to be loaded from a local script")
    require("decoder-reconstructions.png" not in html and "representation-learning.png" not in html, "Conflicting legacy artwork remains")
    require("dataset.editId" in (ROOT / "capstone-js" / "deck-controller.js").read_text(encoding="utf-8"), "Stable edit IDs missing")

    summary = {
        "status": "ok",
        "slides": total_slides,
        "core_slides": core_slides,
        "qa_slides": qa_slides,
        "visuals": len(re.findall(r'data-visual="', html)),
        "palette": EXPECTED_PALETTE,
        "bone_order": EXPECTED_ORDER,
        "success_case": manifest["success_prediction"],
        "failure_case": manifest["failure_prediction"],
        "failure_patella_empty": True,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
