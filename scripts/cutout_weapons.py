"""Chroma-key cutout for the Aries divine weapon reference art.

Removes the magenta backdrop (sampled per-image from a corner pixel,
since generated backgrounds aren't perfectly uniform), despills magenta
tint bleeding onto edge pixels, and trims to the tight content bbox.
"""
import numpy as np
from PIL import Image
import os

SRC_DIR = r"C:\Users\Thien An Nguyen\Downloads\test imagew"
OUT_DIR = r"C:\Users\Thien An Nguyen\SpaceShooter\images\weapons"
FILES = ["1-longsword.png", "2-spear.png", "3-halberd.png", "4-gob-blade.png", "5-enuma-spear.png"]

os.makedirs(OUT_DIR, exist_ok=True)

def cutout(path, out_path):
    img = Image.open(path).convert("RGB")
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    # Sample background color from the 4 corners (averaged) rather than a
    # single pixel, since compression artifacts can shift one corner.
    corners = np.concatenate([
        arr[0:5, 0:5].reshape(-1, 3),
        arr[0:5, w-5:w].reshape(-1, 3),
        arr[h-5:h, 0:5].reshape(-1, 3),
        arr[h-5:h, w-5:w].reshape(-1, 3),
    ], axis=0)
    bg = corners.mean(axis=0)

    diff = arr - bg
    dist = np.sqrt((diff ** 2).sum(axis=2))

    # Smooth falloff: fully transparent under low, fully opaque above high,
    # linear ramp between - avoids a hard jagged cutout edge.
    low, high = 40.0, 110.0
    alpha = np.clip((dist - low) / (high - low), 0, 1)

    # Color decontamination: an edge pixel at partial alpha is really a
    # blend of the true foreground color F and the background B, i.e.
    # observed = a*F + (1-a)*B. Solving for F removes the magenta rim
    # properly instead of just nudging the channels toward green.
    a3 = alpha[..., None]
    safe_a = np.clip(a3, 0.12, 1.0)  # avoid dividing by ~0 on near-invisible pixels
    decontaminated = (arr - (1 - a3) * bg) / safe_a
    decontaminated = np.clip(decontaminated, 0, 255)

    rgba = np.dstack([decontaminated, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, mode="RGBA")

    # Trim to tight content bbox with a small uniform padding.
    bbox = out.getbbox()
    if bbox:
        pad = 8
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(w, r + pad); b = min(h, b + pad)
        out = out.crop((l, t, r, b))

    out.save(out_path)
    print(f"{os.path.basename(path)} -> {out.size[0]}x{out.size[1]}")

for f in FILES:
    cutout(os.path.join(SRC_DIR, f), os.path.join(OUT_DIR, f))
