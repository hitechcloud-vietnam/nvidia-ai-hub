#!/usr/bin/env python3
"""Extend banner images to 2:1 aspect ratio with asymmetric blurred edges.
Left side gets more extension (70%), right side gets less (30%).
"""

from PIL import Image, ImageFilter
import os

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SRC_DIR, "wide")
os.makedirs(OUT_DIR, exist_ok=True)

TARGET_RATIO = 2.0  # width / height
LEFT_RATIO = 0.7    # 70% of extra space goes left
BLUR_RADIUS = 40
BLEND_PX = 60       # gradient blend zone

BANNERS = [
    "qwen-beach.png",
    "qwen-basketball.png",
    "qwen-driving.png",
    "qwen-coder.png",
    "comfyui-spark.jpg",
    "facefusion-spark.png",
    "ollama-openwebui.png",
    "hunyuan3d-spark.png",
    "anythingllm.png",
    "flowise.png",
    "langflow.png",
    "trellis2-spark.png",
    "localai.png",
]

MAX_OUTPUT_W = 3200


def extend_image(src_path, out_path):
    img = Image.open(src_path).convert("RGB")
    w, h = img.size

    target_w = int(h * TARGET_RATIO)
    if target_w <= w:
        # Already wide enough — just crop/resize to exact 2:1
        if w / h > TARGET_RATIO:
            # Wider than 2:1, crop sides symmetrically
            crop_w = int(h * TARGET_RATIO)
            left = (w - crop_w) // 2
            img = img.crop((left, 0, left + crop_w, h))
        img.save(out_path, quality=92)
        print(f"  Already wide: {os.path.basename(src_path)} ({w}x{h})")
        return

    extra = target_w - w
    left_extra = int(extra * LEFT_RATIO)
    right_extra = extra - left_extra

    # Create canvas
    canvas = Image.new("RGB", (target_w, h))

    # Place original image offset to the right (more space on left)
    x_offset = left_extra
    canvas.paste(img, (x_offset, 0))

    # --- Left side fill ---
    # Take left edge of image, mirror it, scale to fill, blur
    grab_w = min(left_extra + BLEND_PX, w)
    left_crop = img.crop((0, 0, grab_w, h))
    left_mirror = left_crop.transpose(Image.FLIP_LEFT_RIGHT)
    left_fill = left_mirror.resize((left_extra + BLEND_PX, h), Image.LANCZOS)
    left_blurred = left_fill.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))
    canvas.paste(left_blurred, (0, 0))

    # --- Right side fill ---
    if right_extra > 0:
        grab_w = min(right_extra + BLEND_PX, w)
        right_crop = img.crop((w - grab_w, 0, w, h))
        right_mirror = right_crop.transpose(Image.FLIP_LEFT_RIGHT)
        right_fill = right_mirror.resize((right_extra + BLEND_PX, h), Image.LANCZOS)
        right_blurred = right_fill.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))
        canvas.paste(right_blurred, (x_offset + w - BLEND_PX, 0))

    # Re-paste original cleanly on top
    canvas.paste(img, (x_offset, 0))

    # --- Smooth blending at seams ---
    # Left seam
    for i in range(BLEND_PX):
        alpha = i / BLEND_PX  # 0 (blurred) → 1 (sharp)
        x = x_offset + i
        if x >= target_w or i >= w:
            break
        for y in range(h):
            bg = left_blurred.getpixel((left_extra + i, y)) if (left_extra + i) < left_blurred.width else (0, 0, 0)
            fg = img.getpixel((i, y))
            blended = tuple(int(bg[c] * (1 - alpha) + fg[c] * alpha) for c in range(3))
            canvas.putpixel((x, y), blended)

    # Right seam
    if right_extra > 0:
        for i in range(BLEND_PX):
            alpha = 1.0 - (i / BLEND_PX)  # 1 (sharp) → 0 (blurred)
            img_x = w - BLEND_PX + i
            x = x_offset + img_x
            if x >= target_w or img_x < 0 or img_x >= w:
                continue
            for y in range(h):
                fg = img.getpixel((img_x, y))
                bx = min(i, right_blurred.width - 1)
                bg = right_blurred.getpixel((bx, y))
                blended = tuple(int(fg[c] * alpha + bg[c] * (1 - alpha)) for c in range(3))
                canvas.putpixel((x, y), blended)

    # Resize if too large
    if canvas.width > MAX_OUTPUT_W:
        ratio = MAX_OUTPUT_W / canvas.width
        canvas = canvas.resize((MAX_OUTPUT_W, int(h * ratio)), Image.LANCZOS)

    # Save
    ext = os.path.splitext(out_path)[1].lower()
    if ext in ('.jpg', '.jpeg'):
        canvas.save(out_path, "JPEG", quality=90)
    else:
        canvas.save(out_path, "PNG", optimize=True)

    final_w, final_h = canvas.size
    print(f"  Done: {os.path.basename(src_path)} ({w}x{h}) → ({final_w}x{final_h})  [L+{left_extra} R+{right_extra}]")


for fname in BANNERS:
    src = os.path.join(SRC_DIR, fname)
    if not os.path.exists(src):
        print(f"  SKIP: {fname}")
        continue
    out = os.path.join(OUT_DIR, fname)
    extend_image(src, out)

print("\nDone!")
