#!/usr/bin/env python3
"""Quick probe: inspect frame content region and sample colors."""
import cv2
import numpy as np
from pathlib import Path

frames_dir = Path("tmp/frames")

def find_content_region(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    row_max = gray.max(axis=1)
    col_max = gray.max(axis=0)
    content_rows = np.where(row_max > 15)[0]
    content_cols = np.where(col_max > 15)[0]
    if len(content_rows) == 0:
        return 0, 0, w, h
    y1, y2 = content_rows[0], content_rows[-1]
    x1, x2 = content_cols[0], content_cols[-1]
    return x1, y1, x2 - x1 + 1, y2 - y1 + 1

# Check frames 1, 6, 12, 18, 24
for fn in [1, 6, 12, 18, 24]:
    img = cv2.imread(str(frames_dir / f"frame_{fn:02d}.png"))
    x, y, cw, ch = find_content_region(img)
    print(f"Frame {fn:02d}: content at ({x},{y}) size {cw}x{ch}")
    # Sample a 5x5 grid of colors within content
    crop = img[y:y+ch, x:x+cw]
    print(f"  AR={cw/ch:.3f} (expected 1.600 for 320x200)")
    # Print a pixel from sky area (top-center), floor area (bottom-center), robot area (middle)
    sky_px = crop[ch//8, cw//2]
    floor_px = crop[ch*7//8, cw//2]
    mid_px = crop[ch//2, cw//2]
    print(f"  sky(BGR): {sky_px}  floor(BGR): {floor_px}  mid(BGR): {mid_px}")
