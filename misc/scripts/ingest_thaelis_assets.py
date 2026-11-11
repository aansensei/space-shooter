"""Ingest the Gemini art for Thaelis (see misc/thaelis-odyssey-art-brief.txt).

Usage:  python3 misc/scripts/ingest_thaelis_assets.py <folder with armor/axe/phantom/sonic images>
        add --dry-run to only report, --no-register to leave sw.js and js/offline.js alone.

For each file found it
  - removes the backdrop: magenta is keyed out to alpha (armor, axe); black is kept, because the
    phantom and the sonic wave are drawn additive and black adds nothing,
  - crops the axe to its own bounds, so the grip and blade fractions in _THAELIS_ART hold,
  - resizes, stamps the PNG text chunks every game image carries (Author, Source = @aansensei),
  - saves it where js/render/enemy-thaelis-warrior.js loads it from,
  - lists it in sw.js and js/offline.js after thaelis-cocoon.png and bumps CACHE_VERSION once.
Any subset of the four files is fine. Needs Pillow and numpy.
"""
import os
import re
import sys

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo

TAG = "@aansensei"
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EXTS = (".png", ".jpg", ".jpeg", ".webp")
ASSETS = {
    # key: (output path, backdrop, crop to content, longest side in px)
    "armor": ("assets/images/game/enemies/thaelis-armor.png", "magenta", False, 1024),
    "axe": ("assets/images/game/enemies/thaelis-axe.png", "magenta", True, 1024),
    "phantom": ("assets/images/game/effects/thaelis-bakhi-phantom.png", "black", False, 1024),
    "sonic": ("assets/images/game/effects/thaelis-sonic-arc.png", "black", False, 896),
}


def key_magenta(img):
    """Chroma key, same method as cutout_weapons.py: corner-sampled backdrop, soft ramp, decontaminated edges."""
    arr = np.array(img.convert("RGB")).astype(np.float32)
    h, w = arr.shape[:2]
    corners = np.concatenate([arr[:5, :5].reshape(-1, 3), arr[:5, w - 5:].reshape(-1, 3),
                              arr[h - 5:, :5].reshape(-1, 3), arr[h - 5:, w - 5:].reshape(-1, 3)])
    bg = corners.mean(axis=0)
    if not (bg[0] > 170 and bg[2] > 170 and bg[1] < 110):
        print(f"    warning: corners are rgb{tuple(int(v) for v in bg)}, not magenta; keying on that colour anyway")
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    alpha = np.clip((dist - 40.0) / 70.0, 0, 1)
    a3 = alpha[..., None]
    rgb = np.clip((arr - (1 - a3) * bg) / np.clip(a3, 0.12, 1.0), 0, 255)
    return Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA")


def clean_black(img):
    """Additive art: crush the near-black backdrop to true black so no grey box shows when it is added to the scene."""
    arr = np.array(img.convert("RGB")).astype(np.float32)
    arr = np.clip((arr - 10.0) * (255.0 / 245.0), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def process(key, src):
    out_rel, backdrop, crop, longest = ASSETS[key]
    img = Image.open(src)
    img = key_magenta(img) if backdrop == "magenta" else clean_black(img)
    if crop:
        box = img.getbbox()
        if box:
            pad = 6
            img = img.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad)))
    scale = longest / max(img.size)
    if abs(scale - 1) > 0.01:
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    if backdrop == "magenta":
        cover = (np.array(img)[..., 3] > 8).mean()
        if cover < 0.03 or cover > 0.97:
            print(f"    warning: {cover:.0%} of the image is opaque, the backdrop may not have keyed cleanly")
    if key == "axe" and img.width < img.height * 1.5:
        print("    warning: the axe should lie horizontal (butt left, blades right); this one looks upright")
    return out_rel, img


def save(img, path):
    meta = PngInfo()
    meta.add_text("Author", TAG)
    meta.add_text("Source", TAG)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", pnginfo=meta, optimize=True)


def register(paths):
    """List new files in the two offline cache manifests, right after the Cocoon sprite."""
    added = False
    for rel in ("sw.js", os.path.join("js", "offline.js")):
        full = os.path.join(REPO, rel)
        text = open(full, encoding="utf-8").read()
        m = re.search(r"^([ \t]*)'assets/images/game/enemies/thaelis-cocoon\.png',\n", text, re.M)
        if not m:
            print(f"  could not find the thaelis-cocoon.png entry in {rel}, add these by hand: {paths}")
            continue
        new = "".join(f"{m.group(1)}'{p}',\n" for p in paths if f"'{p}'" not in text)
        if new:
            text = text[:m.end()] + new + text[m.end():]
            if rel == "sw.js":
                text = re.sub(r"(const CACHE_VERSION = 'v)(\d+)(')", lambda v: f"{v.group(1)}{int(v.group(2)) + 1}{v.group(3)}", text, count=1)
            open(full, "w", encoding="utf-8", newline="\n").write(text)
            added = True
            print(f"  listed in {rel}")
    if not added:
        print("  cache manifests already list these files")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry, no_reg = "--dry-run" in sys.argv, "--no-register" in sys.argv
    if len(args) != 1 or not os.path.isdir(args[0]):
        print(__doc__)
        return 1
    found = {}
    for name in sorted(os.listdir(args[0])):
        stem, ext = os.path.splitext(name.lower())
        if ext in EXTS and stem in ASSETS:
            found[stem] = os.path.join(args[0], name)
    if not found:
        print(f"No armor/axe/phantom/sonic image in {args[0]} (accepted: {', '.join(EXTS)})")
        return 1
    done = []
    for key, src in found.items():
        print(f"{key}: {os.path.basename(src)}")
        out_rel, img = process(key, src)
        print(f"    -> {out_rel}  {img.width}x{img.height} {img.mode}")
        if not dry:
            save(img, os.path.join(REPO, out_rel))
            done.append(out_rel)
    missing = [k for k in ASSETS if k not in found]
    if missing:
        print(f"not supplied (the game keeps its code-drawn version): {', '.join(missing)}")
    if done and not no_reg:
        register(done)
    return 0


if __name__ == "__main__":
    sys.exit(main())
