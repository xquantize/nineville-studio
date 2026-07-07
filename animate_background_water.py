#!/usr/bin/env python3
"""
Experiment: subtle water movement on the site background painting.

Default **shimmer** — slow caustic light breathing on masked water only (no warp).
Use --mode water for a slightly richer highlight pass (still no refraction).

Auto-mask targets deep resin **water blue** and tries hard to exclude gold,
bronze, and purple coral. For best results, paint a manual mask (see --mask).

Requirements:
  pip install opencv-python pillow numpy

Quick start:
  python animate_background_water.py --preview-mask
  python animate_background_water.py --also-mobile

Manual mask (white = water, black = keep still):
  python animate_background_water.py --mask my-water-mask.png --preview-mask
"""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def load_bgr(path: Path, max_width: int | None) -> np.ndarray:
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {path}")
    if max_width and max_width > 0 and img.shape[1] > max_width:
        scale = max_width / img.shape[1]
        height = max(1, int(img.shape[0] * scale))
        img = cv2.resize(img, (max_width, height), interpolation=cv2.INTER_AREA)
    return img


def load_mask(path: Path, size: tuple[int, int]) -> np.ndarray:
    """Load grayscale mask, resize to (width, height), return float 0..1."""
    mask = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise FileNotFoundError(f"Could not read mask: {path}")
    w, h = size
    if mask.shape[1] != w or mask.shape[0] != h:
        mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LINEAR)
    return np.clip(mask.astype(np.float32) / 255.0, 0.0, 1.0)


def feather_mask(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    k = max(3, radius | 1)
    return cv2.GaussianBlur(mask, (k, k), 0)


def blue_water_mask(bgr: np.ndarray, feather: int) -> np.ndarray:
    """
    Mask open water in the resin painting — NOT gold land or purple coral.

    HSV alone bleeds onto warm highlights; this combines hue + blue dominance
    + anti-warm rejection + largest-region cleanup.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    b, g, r = cv2.split(bgr)

    b_f = b.astype(np.float32)
    r_f = r.astype(np.float32)
    g_f = g.astype(np.float32)

    hue_water = (h >= 88) & (h <= 118)
    sat_min = s >= 45
    val_min = v >= 30

    blue_dominant = (b_f > r_f * 1.12) & (b_f > g_f * 0.98) & (b_f - r_f > 18)
    not_warm = (r_f < b_f * 1.02) & (r_f - b_f < 35) & (r_f < 195)
    not_purple = ~((h >= 125) & (s >= 35))

    combined = (
        hue_water & sat_min & val_min & blue_dominant & not_warm & not_purple
    ).astype(np.uint8) * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=1)
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=2)

    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(combined, connectivity=8)
    if n_labels > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        min_area = max(800, int(bgr.shape[0] * bgr.shape[1] * 0.002))
        keep = np.zeros_like(combined)
        for label_id, area in enumerate(areas, start=1):
            if area >= min_area:
                keep[labels == label_id] = 255
        combined = keep

    mask_f = combined.astype(np.float32) / 255.0
    return np.clip(feather_mask(mask_f, feather), 0.0, 1.0)


def loop_harmonics(frame: int, frames: int) -> tuple[float, float, float, float]:
    """
    Loop-safe time basis: u in [0, 1) with u=0 identical to u=1.
    Returns cos/sin at 1× and 2× loop frequency (integer cycles per loop).
    """
    u = frame / frames
    angle = 2.0 * math.pi * u
    return math.cos(angle), math.sin(angle), math.cos(2.0 * angle), math.sin(2.0 * angle)


def subtle_caustics(
    width: int,
    height: int,
    frame: int,
    frames: int,
    scale: float,
) -> np.ndarray:
    """
    Caustic shimmer with loop-safe phase motion (harmonics return to start each loop).
    """
    c1, s1, c2, s2 = loop_harmonics(frame, frames)

    # Phase offsets from harmonics — identical at frame 0 and frame N.
    phase_x = 2.2 * c1 + 1.0 * s2
    phase_y = 1.4 * s1 + 0.8 * c2
    phase_z = 0.9 * c2 + 0.5 * s1

    ys = np.arange(height, dtype=np.float32).reshape(-1, 1)
    xs = np.arange(width, dtype=np.float32).reshape(1, -1)

    field_a = np.sin(xs * scale * 1.02 + phase_x) * np.sin(ys * scale * 0.88 + phase_y)
    field_b = np.sin(xs * scale * 1.65 + phase_z + 0.9) * np.sin(
        ys * scale * 1.35 - phase_x * 0.6 + 0.2
    )
    field_c = np.sin(xs * scale * 2.4 + phase_y * 1.2 + 1.6) * np.sin(
        ys * scale * 2.1 - phase_z + 0.7
    )

    spatial = field_a * 0.5 + field_b * 0.32 + field_c * 0.18
    spatial = np.clip((spatial + 1.0) * 0.5, 0.0, 1.0)
    spatial = np.power(spatial, 0.72)

    breathe = 0.55 * c1 + 0.30 * c2 + 0.15 * s1
    modulation = 0.62 + 0.38 * breathe

    return np.clip(spatial * modulation, 0.0, 1.0)


def soft_sheen(
    width: int,
    height: int,
    frame: int,
    frames: int,
    scale: float,
) -> np.ndarray:
    """Gentle horizontal glint — also amplitude-modulated only."""
    c1, s1, _, _ = loop_harmonics(frame, frames)

    ys = np.arange(height, dtype=np.float32).reshape(-1, 1)
    xs = np.arange(width, dtype=np.float32).reshape(1, -1)

    band = np.sin(xs * scale * 0.28 + ys * scale * 0.05)
    band = np.clip((band + 1.0) * 0.5, 0.0, 1.0)
    band = np.power(band, 3.5)

    glint = 0.55 + 0.45 * (0.65 * c1 + 0.35 * s1)
    return np.clip(band * glint, 0.0, 1.0)


def apply_water_light(
    base_f: np.ndarray,
    mask: np.ndarray,
    caustics: np.ndarray,
    sheen: np.ndarray | None,
    strength: float,
    sheen_mix: float,
) -> np.ndarray:
    """Blend highlight lift into masked water regions."""
    highlight = np.clip((caustics - 0.42) / 0.58, 0.0, 1.0)
    shadow = np.clip((0.40 - caustics) / 0.40, 0.0, 1.0)
    lift = (highlight * 1.0 - shadow * 0.3) * strength

    if sheen is not None and sheen_mix > 0:
        lift = lift + np.clip((sheen - 0.5) / 0.5, 0.0, 1.0) * strength * sheen_mix

    scale = 255.0 * strength
    out = base_f.copy()
    out[:, :, 0] += lift * scale * 1.25
    out[:, :, 1] += lift * scale * 0.95
    out[:, :, 2] += lift * scale * 0.55

    mask3 = mask[..., None]
    blended = base_f * (1.0 - mask3) + out * mask3
    return np.clip(blended, 0, 255).astype(np.uint8)


def frame_shimmer(
    base: np.ndarray,
    mask: np.ndarray,
    frame: int,
    frames: int,
    strength: float,
    caustic_scale: float,
) -> np.ndarray:
    base_f = base.astype(np.float32)
    caustics = subtle_caustics(base.shape[1], base.shape[0], frame, frames, caustic_scale)
    return apply_water_light(base_f, mask, caustics, None, strength, 0.0)


def frame_water(
    base: np.ndarray,
    mask: np.ndarray,
    frame: int,
    frames: int,
    strength: float,
    caustic_scale: float,
    sheen_mix: float,
) -> np.ndarray:
    """Slightly richer than shimmer — still no warp/refraction."""
    w, h = base.shape[1], base.shape[0]
    base_f = base.astype(np.float32)
    caustics = subtle_caustics(w, h, frame, frames, caustic_scale)
    sheen = soft_sheen(w, h, frame, frames, caustic_scale)
    return apply_water_light(base_f, mask, caustics, sheen, strength, sheen_mix)


def blend_loop_seam(frames: list[np.ndarray], overlap: int) -> list[np.ndarray]:
    """
    Crossfade the last frames into the first so the GIF loops without a visible pop.
    """
    if overlap < 1 or len(frames) < overlap + 2:
        return frames

    n = len(frames)
    out = [f.copy() for f in frames]
    for i in range(overlap):
        alpha = (i + 1) / overlap
        idx = n - overlap + i
        out[idx] = cv2.addWeighted(frames[idx], 1.0 - alpha, frames[i], alpha, 0)
    return out


def bgr_to_pil(bgr: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


def save_gif(frames: list[Image.Image], path: Path, duration_ms: int) -> None:
    first, rest = frames[0], frames[1:]
    first.save(
        path,
        save_all=True,
        append_images=rest,
        duration=duration_ms,
        loop=0,
        optimize=True,
        disposal=2,
    )


def save_animated_webp(
    frames: list[Image.Image],
    path: Path,
    duration_ms: int,
    quality: int,
) -> None:
    first, rest = frames[0], frames[1:]
    first.save(
        path,
        save_all=True,
        append_images=rest,
        duration=duration_ms,
        loop=0,
        format="WEBP",
        quality=quality,
        method=6,
    )


def save_animation(
    frames: list[Image.Image],
    path: Path,
    duration_ms: int,
    fmt: str,
    quality: int,
) -> None:
    if fmt == "gif":
        save_gif(frames, path, duration_ms)
    elif fmt == "webp":
        save_animated_webp(frames, path, duration_ms, quality)
    else:
        raise ValueError(f"Use save_video() for format: {fmt}")


def save_video(
    frames: list[np.ndarray],
    path: Path,
    fps: float,
    codec: str = "avc1",
) -> None:
    """Encode every frame to MP4/WebM — no frame dropping (silky playback in <video>)."""
    if not frames:
        raise ValueError("No frames to encode")

    h, w = frames[0].shape[:2]
    path.parent.mkdir(parents=True, exist_ok=True)

    if shutil.which("ffmpeg"):
        _save_video_ffmpeg(frames, path, fps)
        return

    fourcc = cv2.VideoWriter_fourcc(*codec)
    writer = cv2.VideoWriter(str(path), fourcc, fps, (w, h))
    if not writer.isOpened():
        raise RuntimeError(f"Could not open video writer for {path} (codec {codec})")

    for frame in frames:
        writer.write(frame)
    writer.release()


def _save_video_ffmpeg(frames: list[np.ndarray], path: Path, fps: float) -> None:
    """Higher-quality H.264 when ffmpeg is available."""
    h, w = frames[0].shape[:2]
    suffix = path.suffix.lower()
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for i, frame in enumerate(frames):
            cv2.imwrite(str(tmp_path / f"frame_{i:04d}.png"), frame)

        if suffix == ".webm":
            cmd = [
                "ffmpeg",
                "-y",
                "-framerate",
                str(fps),
                "-i",
                str(tmp_path / "frame_%04d.png"),
                "-c:v",
                "libvpx-vp9",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "28",
                "-b:v",
                "0",
                str(path),
            ]
        else:
            cmd = [
                "ffmpeg",
                "-y",
                "-framerate",
                str(fps),
                "-i",
                str(tmp_path / "frame_%04d.png"),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "18",
                "-preset",
                "slow",
                "-movflags",
                "+faststart",
                str(path),
            ]

        subprocess.run(cmd, check=True, capture_output=True)


def write_mask_preview(base: np.ndarray, mask: np.ndarray, output: Path) -> None:
    preview = (mask * 255).astype(np.uint8)
    overlay = base.copy()
    tint = np.array([255, 90, 30], dtype=np.float32)
    m = mask > 0.12
    overlay[m] = (overlay[m].astype(np.float32) * 0.5 + tint * 0.5).astype(np.uint8)
    cv2.imwrite(str(output.with_name(f"{output.stem}-mask.png")), preview)
    cv2.imwrite(str(output.with_name(f"{output.stem}-mask-overlay.png")), overlay)


def render_animation(
    *,
    input_path: Path,
    output_path: Path,
    width: int | None,
    mask_path: Path | None,
    mode: str,
    frames: int,
    fps: float,
    feather: int,
    strength: float,
    caustic_scale: float,
    sheen_mix: float,
    loop_blend: int,
    fmt: str,
    quality: int,
    preview_mask: bool,
) -> None:
    base = load_bgr(input_path, width)
    h, w = base.shape[:2]

    if mask_path is None:
        default_mask = Path("background-water-mask.png")
        if default_mask.exists():
            mask_path = default_mask

    if mask_path:
        mask = feather_mask(load_mask(mask_path, (w, h)), feather)
        print(f"Using manual mask: {mask_path}")
    else:
        mask = blue_water_mask(base, feather)
        print("Using auto blue-water mask (use --mask for manual control)")

    if preview_mask:
        write_mask_preview(base, mask, output_path)
        print(f"Wrote {output_path.stem}-mask.png and -mask-overlay.png")
        return

    duration_ms = int(1000 / max(fps, 1))
    bgr_frames: list[np.ndarray] = []

    print(f"Mode: {mode} — {frames} frames at {w}x{h} → {output_path.name}")
    for i in range(frames):
        if mode == "water":
            frame_bgr = frame_water(
                base, mask, i, frames, strength, caustic_scale, sheen_mix
            )
        else:
            frame_bgr = frame_shimmer(base, mask, i, frames, strength, caustic_scale)
        bgr_frames.append(frame_bgr)
        print(f"  frame {i + 1}/{frames}", end="\r")

    if loop_blend > 0:
        bgr_frames = blend_loop_seam(bgr_frames, loop_blend)
        print(f"\nLoop seam blend: {loop_blend} frames")

    pil_frames = [bgr_to_pil(f) for f in bgr_frames]
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if fmt in ("mp4", "webm"):
        if output_path.suffix.lower() not in (".mp4", ".webm"):
            output_path = output_path.with_suffix(f".{fmt}")
        save_video(bgr_frames, output_path, fps, codec="avc1" if fmt == "mp4" else "VP90")
    else:
        save_animation(pil_frames, output_path, duration_ms, fmt, quality)

    print(f"Wrote {output_path} ({output_path.stat().st_size / 1024:.0f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Animate water on the background painting.")
    parser.add_argument("--input", type=Path, default=Path("public/images/background.webp"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/images/background-water.mp4"),
    )
    parser.add_argument(
        "--mask",
        type=Path,
        default=None,
        help="Optional manual mask PNG (white = water). Best quality.",
    )
    parser.add_argument(
        "--format",
        choices=("mp4", "webm", "webp", "gif"),
        default="mp4",
        help="mp4 = silky <video> playback (default). webp/gif = legacy.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=90,
        help="WebP quality (webp format only)",
    )
    parser.add_argument(
        "--also-mobile",
        action="store_true",
        default=True,
        help="Also render mobile variant (default: on)",
    )
    parser.add_argument(
        "--no-mobile",
        action="store_true",
        help="Skip mobile render",
    )
    parser.add_argument(
        "--mode",
        choices=("shimmer", "water"),
        default="water",
        help="water = caustics + sheen (default). shimmer = caustics only.",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=2048,
        help="Max output width (default: full 2048 desktop)",
    )
    parser.add_argument("--frames", type=int, default=48)
    parser.add_argument("--fps", type=float, default=24.0)
    parser.add_argument("--feather", type=int, default=31, help="Soften mask edges (px)")
    parser.add_argument("--strength", type=float, default=0.32, help="Light intensity")
    parser.add_argument("--caustic-scale", type=float, default=0.018, help="Caustic cell size")
    parser.add_argument(
        "--sheen-mix",
        type=float,
        default=0.35,
        help="Sheen amount in water mode (0–1)",
    )
    parser.add_argument(
        "--loop-blend",
        type=int,
        default=8,
        help="Crossfade tail frames into head for seamless loop (0=off)",
    )
    parser.add_argument("--preview-mask", action="store_true")
    args = parser.parse_args()

    common = {
        "mask_path": args.mask,
        "mode": args.mode,
        "frames": args.frames,
        "fps": args.fps,
        "feather": args.feather,
        "strength": args.strength,
        "caustic_scale": args.caustic_scale,
        "sheen_mix": args.sheen_mix,
        "loop_blend": args.loop_blend,
        "fmt": args.format,
        "quality": args.quality,
        "preview_mask": args.preview_mask,
    }

    render_animation(
        input_path=args.input,
        output_path=args.output,
        width=args.width,
        **common,
    )

    if args.also_mobile and not args.no_mobile and not args.preview_mask:
        mobile_out = args.output.with_name(
            args.output.name.replace("background-water", "background-water-mobile", 1)
        )
        render_animation(
            input_path=Path("public/images/background-mobile.webp"),
            output_path=mobile_out,
            width=None,
            **common,
        )


if __name__ == "__main__":
    main()
