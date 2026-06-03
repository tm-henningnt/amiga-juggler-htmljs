#!/usr/bin/env python3
"""
Detect the 3 juggling balls in each of the 24 reference frames and
back-project to 3D world coordinates.

Key insight: all balls are within ~5 world-units of the robot (at the origin),
and the camera is ~10.5 units from the origin along viewDir.  Depth variation
is small (±5%) so we use a fixed nominal depth and rely on (i,j) for direction.

Camera model (src/scenes.ts / src/renderer.ts):
  effFocal = 0.028 * 35 = 0.98
  px = 1/320,  py = 0.75/200
  viewDir, uhat, vhat from altitude=-10°, azimuth=20°

Back-projection with fixed depth A_NOM:
  P = observer + A_NOM*viewDir + (x_vp*A_NOM/effFocal)*uhat + (y_vp*A_NOM/effFocal)*vhat
  where x_vp = (i-160)*px,  y_vp = (100-j)*py
"""

import cv2
import numpy as np
import json
import math
from pathlib import Path

# ─── Camera constants ──────────────────────────────────────────────────────────
OBSERVER  = np.array([-10.0, -4.0, 5.5])
EFF_FOCAL = 0.98         # 0.028 * 35
NX, NY    = 320, 200
PX, PY    = 1.0/NX, 0.75/NY

_alt, _az = math.radians(-10.0), math.radians(20.0)
VIEW_DIR = np.array([math.cos(_az)*math.cos(_alt),
                     math.sin(_az)*math.cos(_alt),
                     math.sin(_alt)])
UHAT = np.array([math.sin(_az), -math.cos(_az), 0.0])
VHAT = np.array([-math.cos(_az)*math.sin(_alt),
                 -math.sin(_az)*math.sin(_alt),
                  math.cos(_alt)])

# Ball radius in 320x200 when ball is at nominal depth:
#   r = R_world * effFocal * NX / depth = 0.6 * 0.98 * 320 / 10.5 ≈ 17.9 px
# We use this fixed radius → fixed depth ≈ 10.5 units
BALL_R_PX = 18.0
A_NOM     = 0.6 * EFF_FOCAL * NX / BALL_R_PX   # ≈ 10.44

def backproject(i_r, j_r):
    """Back-project 320x200 pixel to world 3D using nominal depth."""
    xv = (i_r - NX/2.0) * PX
    yv = (NY/2.0 - j_r) * PY
    k  = A_NOM / EFF_FOCAL
    return OBSERVER + A_NOM*VIEW_DIR + k*xv*UHAT + k*yv*VHAT

# ─── Frames ───────────────────────────────────────────────────────────────────

def load_frames(frames_dir):
    frames = []
    for fn in range(1, 25):
        img = cv2.imread(str(frames_dir / f"frame_{fn:02d}.png"))
        if img is None:
            raise FileNotFoundError(f"frame_{fn:02d}.png")
        frames.append(cv2.resize(img, (NX, NY), interpolation=cv2.INTER_AREA))
    return frames

def compute_background(frames):
    return np.median(np.stack(frames, 0).astype(np.float32), 0).astype(np.uint8)

# ─── Detection ────────────────────────────────────────────────────────────────

def diff_heatmap(frame_bgr, background_bgr):
    """
    Compute a heatmap that highlights BALL positions.

    Balls are reflective multi-channel movers.  Robot arms are primarily
    red-channel movers.  We penalise single-channel (red-dominant) diffs.
    """
    diff = cv2.absdiff(frame_bgr, background_bgr).astype(float)
    b, g, r = diff[:,:,0], diff[:,:,1], diff[:,:,2]

    # Multi-channel diff → ball signal; single-red → arm signal
    heat = b + g + r - 1.8 * np.maximum(r - np.maximum(b, g), 0)
    heat = np.clip(heat, 0, 255).astype(np.uint8)

    # Suppress floor (j ≥ 115) and top-sky (j < 5)
    heat[:5,  :] = 0
    heat[115:, :] = 0

    return heat

def find_blob_centroids(heat, background_bgr, n=3, sigma=7.0, min_dist=18):
    """
    Find up to n ball centroids as peaks in the smoothed heatmap.

    Extra filter: suppress pixels in the robot-body region of the background.
    """
    # Build robot-body mask from background (red regions = robot body)
    bg_hsv = cv2.cvtColor(background_bgr, cv2.COLOR_BGR2HSV)
    h_b, s_b, v_b = bg_hsv[:,:,0], bg_hsv[:,:,1], bg_hsv[:,:,2]
    robot_mask = (((h_b <= 12) | (h_b >= 168)) & (s_b > 90) & (v_b > 60)).astype(np.uint8)
    # Dilate robot mask so we exclude nearby pixels too
    robot_mask = cv2.dilate(robot_mask, np.ones((9,9), np.uint8), iterations=2)

    # Suppress robot region in heat
    heat_clean = heat.copy()
    heat_clean[robot_mask > 0] = 0

    # Smooth to get ball-sized blobs
    k = int(sigma * 4) | 1  # odd kernel size ≈ 4σ
    smooth = cv2.GaussianBlur(heat_clean.astype(float), (k, k), sigma)

    # Also add contribution from the raw (non-robot-suppressed) heat to
    # recover balls that partially overlap the robot boundary
    smooth2 = cv2.GaussianBlur(heat.astype(float), (k, k), sigma)
    smooth = 0.7 * smooth + 0.3 * smooth2

    # Find top-n peaks by non-maximum suppression
    peaks = []
    working = smooth.copy()
    for _ in range(n * 4):   # oversample, filter later
        idx = np.argmax(working)
        j_pk, i_pk = np.unravel_index(idx, working.shape)
        val = working[j_pk, i_pk]
        if val < 5:
            break
        peaks.append((float(i_pk), float(j_pk), float(val)))
        # Suppress neighbourhood
        r_supp = int(min_dist)
        j0, j1 = max(0, j_pk-r_supp), min(NY, j_pk+r_supp+1)
        i0, i1 = max(0, i_pk-r_supp), min(NX, i_pk+r_supp+1)
        working[j0:j1, i0:i1] = 0

    # Keep top-n, sorted by value descending
    peaks.sort(key=lambda p: p[2], reverse=True)
    return peaks[:n]

def detect_balls(frame_bgr, background_bgr):
    heat = diff_heatmap(frame_bgr, background_bgr)
    peaks = find_blob_centroids(heat, background_bgr, n=3)
    centroids = [(p[0], p[1]) for p in peaks]
    return centroids, heat

# ─── Debug output ─────────────────────────────────────────────────────────────

def save_debug(frame, heat, centroids, path):
    frame3 = cv2.resize(frame, (NX*3, NY*3), interpolation=cv2.INTER_NEAREST)
    heat3  = cv2.resize(cv2.applyColorMap(np.clip(heat, 0, 255).astype(np.uint8),
                                          cv2.COLORMAP_HOT),
                        (NX*3, NY*3), interpolation=cv2.INTER_NEAREST)
    row = np.hstack([frame3, heat3])
    for (ci, cj) in centroids:
        r3 = int(BALL_R_PX * 3)
        cv2.circle(row, (int(ci*3), int(cj*3)), r3, (0, 255, 0), 2)
        cv2.circle(row, (int(ci*3), int(cj*3)), 3, (0, 0, 255), -1)
    cv2.imwrite(str(path), row)

# ─── Tracking ─────────────────────────────────────────────────────────────────

def track(all_3d):
    tracked = [None]*3
    paths   = [[], [], []]
    for fi, balls in enumerate(all_3d):
        if len(balls) != 3:
            continue
        arrs = [np.array(b) for b in balls]
        if all(t is None for t in tracked):
            for k in range(3):
                tracked[k] = arrs[k]
                paths[k].append((fi, balls[k]))
            continue
        used, assign = set(), {}
        for k in range(3):
            if tracked[k] is None:
                continue
            bj, bd = -1, 1e9
            for j, b in enumerate(arrs):
                if j in used:
                    continue
                d = float(np.linalg.norm(b - tracked[k]))
                if d < bd:
                    bd, bj = d, j
            if bj >= 0:
                assign[k] = bj
                used.add(bj)
        for k, j in assign.items():
            tracked[k] = arrs[j]
            paths[k].append((fi, balls[j]))
    return paths

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    frames_dir = Path("tmp/frames")
    debug_dir  = Path("tmp/debug5")
    debug_dir.mkdir(exist_ok=True)

    print("Loading 24 frames …")
    frames = load_frames(frames_dir)
    bg     = compute_background(frames)
    cv2.imwrite("tmp/background_320x200.png",
                cv2.resize(bg, (NX*3, NY*3), interpolation=cv2.INTER_NEAREST))
    print(f"Fixed depth A_NOM = {A_NOM:.3f}  (ball r = {BALL_R_PX} px in 320x200)")
    print()

    results  = {"frames": []}
    all_3d   = []
    all_px   = []

    for fn in range(1, 25):
        fi = fn - 1
        centroids, heat = detect_balls(frames[fi], bg)

        balls_3d = []
        balls_px  = []
        for (ci, cj) in centroids:
            pos = backproject(ci, cj)
            balls_3d.append([round(float(x), 3) for x in pos])
            balls_px.append([round(ci, 1), round(cj, 1)])

        save_debug(frames[fi], heat, centroids, debug_dir / f"debug_{fn:02d}.png")

        n   = len(centroids)
        tag = "OK" if n == 3 else f"WARN({n})"
        print(f"Frame {fn:02d}: {tag}")
        for k, p in enumerate(balls_3d):
            print(f"  ball{k}: px={balls_px[k]}  3d=[{p[0]:+.2f}, {p[1]:+.2f}, {p[2]:.2f}]")

        all_3d.append(balls_3d)
        all_px.append(balls_px)
        results["frames"].append({
            "frame": fi, "frame_num": fn,
            "n": n, "balls_px": balls_px, "balls_3d": balls_3d
        })

    print("\n── Ball tracking ────────────────────────────────────────────────")
    paths = track(all_3d)

    good_frames = sum(1 for b in all_3d if len(b) == 3)
    print(f"\n{good_frames}/24 frames with 3 balls detected")
    print("\nPer-ball trajectory:")
    for k in range(3):
        print(f"\n  Ball {k} ({len(paths[k])} frames):")
        for fi, pos in paths[k]:
            print(f"    f{fi+1:02d}: [{pos[0]:+.3f}, {pos[1]:+.3f}, {pos[2]:.3f}]")

    # Emit BALL_PATH if we have enough coverage
    path0 = [pos for _, pos in paths[0]]
    if len(path0) >= 20:
        print("\n── Suggested BALL_PATH (ball 0 trajectory) ─────────────────────")
        print("const BALL_PATH: Vec3[] = [")
        for i, p in enumerate(path0):
            comma = "," if i < len(path0)-1 else ""
            print(f"  [{p[0]}, {p[1]}, {p[2]}]{comma}")
        print("];")

    out = Path("tmp/ball_analysis.json")
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved → {out}")

if __name__ == "__main__":
    main()
