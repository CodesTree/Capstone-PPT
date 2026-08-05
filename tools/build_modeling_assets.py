"""Build reproducible presentation assets from the XrayTo3D project outputs.

The script converts saved scientific arrays into browser-safe data assets. It does
not retrain or alter any model. Meshes are extracted from binary occupancy grids
with marching cubes and embedded as base64 GLB payloads so the final deck works
when opened directly from ``file://``.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
from pathlib import Path

import nibabel as nib
import numpy as np
import timm
import torch
import trimesh
from PIL import Image
from skimage.measure import marching_cubes


BONES = ("femur", "tibia", "patella", "fibula")
PALETTE = {
    "femur": "#1457D9",
    "tibia": "#F28C28",
    "patella": "#187B61",
    "fibula": "#FF3300",
}
SUCCESS_CASE = "VSD_005_Left"
FAILURE_CASE = "VSD_z023_Left"
SPACING_MM = (0.78125, 0.78125, 0.78125)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def png_data_uri(array: np.ndarray) -> tuple[str, dict]:
    array = np.asarray(array, dtype=np.float32)
    if not np.isfinite(array).all():
        raise ValueError("image contains non-finite values")
    lo, hi = float(np.percentile(array, 0.5)), float(np.percentile(array, 99.5))
    if hi <= lo:
        lo, hi = float(array.min()), float(array.max())
    normalized = np.clip((array - lo) / max(hi - lo, 1e-8), 0.0, 1.0)
    pixels = np.round(normalized * 255).astype(np.uint8)
    stream = io.BytesIO()
    Image.fromarray(pixels, mode="L").save(stream, format="PNG", optimize=True)
    payload = base64.b64encode(stream.getvalue()).decode("ascii")
    return f"data:image/png;base64,{payload}", {
        "shape": list(array.shape),
        "display_percentiles": [lo, hi],
    }


def glb_base64(mask: np.ndarray) -> tuple[str | None, dict]:
    occupancy = np.asarray(mask, dtype=np.uint8)
    if occupancy.shape != (256, 256, 256):
        raise ValueError(f"invalid occupancy volume shape: {occupancy.shape}")
    if occupancy.sum() == 0:
        return None, {
            "voxel_count": 0,
            "vertices": 0,
            "faces": 0,
            "bounds_mm": None,
            "centroid_mm": None,
            "empty_prediction": True,
        }
    vertices, faces, _, _ = marching_cubes(
        occupancy,
        level=0.5,
        spacing=SPACING_MM,
        step_size=2,
        allow_degenerate=False,
    )
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    glb = mesh.export(file_type="glb")
    if not isinstance(glb, (bytes, bytearray)):
        raise TypeError("trimesh did not return binary GLB data")
    bounds = mesh.bounds.tolist()
    return base64.b64encode(glb).decode("ascii"), {
        "voxel_count": int(occupancy.sum()),
        "vertices": int(len(vertices)),
        "faces": int(len(faces)),
        "bounds_mm": bounds,
        "centroid_mm": mesh.centroid.tolist(),
        "empty_prediction": False,
    }


def load_ground_truth(root: Path, case: str) -> tuple[dict[str, np.ndarray], dict[str, str]]:
    cohort = "healthy"
    folder = root / "artifacts" / "gt_per_bone_256" / cohort / case
    arrays, hashes = {}, {}
    for bone in BONES:
        path = folder / f"{case}_{bone}.nii.gz"
        image = nib.load(str(path))
        array = np.asarray(image.dataobj, dtype=np.float32) > 0.5
        arrays[bone] = array
        hashes[bone] = sha256(path)
    return arrays, hashes


def load_prediction(root: Path, fold: int, arm: str, case: str) -> tuple[dict[str, np.ndarray], str]:
    path = root / "models" / "decoders" / "foundation_stage2_v1" / f"fold_{fold}" / arm / "oof_masks" / f"{case}.npz"
    archive = np.load(path)
    bones = tuple(str(value) for value in archive["bones"].tolist())
    if bones != BONES:
        raise ValueError(f"unexpected channel order in {path}: {bones}")
    prediction = archive["prediction"].astype(bool)
    if prediction.shape != (4, 256, 256, 256):
        raise ValueError(f"unexpected prediction shape in {path}: {prediction.shape}")
    return {bone: prediction[index] for index, bone in enumerate(BONES)}, sha256(path)


def load_drrs(root: Path, case: str) -> tuple[dict[str, np.ndarray], dict[str, str]]:
    manifest_path = root / "reports" / "manifests" / "quantitative_manifest_v1.csv"
    import csv

    with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    row = next(record for record in rows if record["sample_id"] == case)
    arrays, hashes = {}, {}
    for view, field in (("ap", "ap_drr_path"), ("lat", "lat_drr_path")):
        path = root / row[field]
        arrays[view] = np.load(path).astype(np.float32)
        hashes[view] = sha256(path)
    return arrays, hashes


def feature_energy_maps(root: Path, ap: np.ndarray) -> tuple[list[np.ndarray], str]:
    checkpoint_path = root / "models" / "foundation_stage2_v1" / "fold4" / "fcmae_p2_encoder.pth"
    provenance_path = root / "models" / "foundation_stage2_v1" / "fold4" / "fcmae_p1_provenance.json"
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    config = provenance["pretrained_configuration"]
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    encoder = timm.create_model("convnextv2_tiny.fcmae", pretrained=False, features_only=True)
    encoder.load_state_dict(checkpoint["encoder_state"], strict=True)
    encoder.eval()
    image = torch.from_numpy(ap).float().unsqueeze(0).unsqueeze(0).repeat(1, 3, 1, 1)
    mean = torch.tensor(config["mean"]).view(1, 3, 1, 1)
    std = torch.tensor(config["std"]).view(1, 3, 1, 1)
    with torch.no_grad():
        levels = encoder((image - mean) / std)
    maps = [torch.sqrt(level.float().square().mean(dim=1))[0].numpy() for level in levels]
    expected = [(64, 64), (32, 32), (16, 16), (8, 8)]
    if [tuple(value.shape) for value in maps] != expected:
        raise ValueError(f"unexpected feature map sizes: {[value.shape for value in maps]}")
    return maps, sha256(checkpoint_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True, type=Path, help="Path to the inner TestProject project directory")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    root = args.project_root.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    drrs, drr_hashes = load_drrs(root, SUCCESS_CASE)
    features, encoder_hash = feature_energy_maps(root, drrs["ap"])
    success_prediction, success_prediction_hash = load_prediction(root, 4, "residual_relu_style", SUCCESS_CASE)
    failure_prediction, failure_prediction_hash = load_prediction(root, 2, "residual_vnet_style", FAILURE_CASE)
    failure_target, failure_target_hashes = load_ground_truth(root, FAILURE_CASE)

    assets = {
        "schemaVersion": "capstone-model-assets-v1",
        "palette": PALETTE,
        "boneOrder": list(BONES),
        "spacingMm": list(SPACING_MM),
        "drr": {},
        "features": [],
        "meshes": {"successPrediction": {}, "failurePrediction": {}, "failureTarget": {}},
    }
    manifest = {
        "schema_version": "capstone-model-assets-v1",
        "project_root": str(root),
        "bone_order": list(BONES),
        "palette": PALETTE,
        "spacing_mm": list(SPACING_MM),
        "drr": {"case": SUCCESS_CASE, "source_sha256": drr_hashes},
        "features": {"case": SUCCESS_CASE, "encoder_sha256": encoder_hash, "aggregation": "rms_across_channels"},
        "success_prediction": {"case": SUCCESS_CASE, "fold": 4, "arm": "residual_relu_style", "source_sha256": success_prediction_hash},
        "failure_prediction": {"case": FAILURE_CASE, "fold": 2, "arm": "residual_vnet_style", "source_sha256": failure_prediction_hash},
        "failure_target": {"case": FAILURE_CASE, "source_sha256": failure_target_hashes},
        "mesh_extraction": {"algorithm": "skimage.measure.marching_cubes", "level": 0.5, "step_size": 2},
    }

    for view, array in drrs.items():
        uri, metadata = png_data_uri(array)
        assets["drr"][view] = uri
        manifest["drr"][view] = metadata

    channels = (96, 192, 384, 768)
    for index, (array, channel_count) in enumerate(zip(features, channels)):
        uri, metadata = png_data_uri(array)
        assets["features"].append({"uri": uri, "resolution": int(array.shape[0]), "channels": channel_count})
        manifest["features"][f"level_{index}"] = metadata | {"channels": channel_count}

    mesh_groups = (
        ("successPrediction", success_prediction),
        ("failurePrediction", failure_prediction),
        ("failureTarget", failure_target),
    )
    for group_name, volumes in mesh_groups:
        manifest[group_name] = manifest.get(group_name, {}) | {"bones": {}}
        for bone in BONES:
            payload, metadata = glb_base64(volumes[bone])
            assets["meshes"][group_name][bone] = payload
            manifest[group_name]["bones"][bone] = metadata

    manifest_path = output / "model-assets-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    js_path = output / "model-assets.js"
    js_path.write_text(
        "/* Generated by tools/build_modeling_assets.py. Do not edit by hand. */\n"
        + "window.CapstoneModelAssets = "
        + json.dumps(assets, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(json.dumps({"manifest": str(manifest_path), "javascript": str(js_path), "javascript_bytes": js_path.stat().st_size}, indent=2))


if __name__ == "__main__":
    main()
