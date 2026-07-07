#!/usr/bin/env bash
# Optimize images for Nineville Studio.
# Requires ImageMagick (`convert`).
#
# Usage:
#   ./scripts/optimize-images.sh background path/to/painting.png
#   ./scripts/optimize-images.sh work path/to/painting.jpg [output-name]
#
# Background: desktop WebP max 2048px + mobile WebP max 1280px
# Work: cropped to 4:5 at 1200×1500, WebP ~82 quality → public/images/works/

set -euo pipefail

MODE="${1:-}"
INPUT="${2:-}"
OUTPUT_NAME="${3:-}"

if [[ -z "$MODE" || -z "$INPUT" ]]; then
  echo "Usage: $0 background <file.png> | work <file.jpg> [output-name]"
  exit 1
fi

if ! command -v convert &>/dev/null; then
  echo "ImageMagick (convert) is required."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$MODE" in
  background)
    DESKTOP="$ROOT/public/images/background.webp"
    MOBILE="$ROOT/public/images/background-mobile.webp"
    OG="$ROOT/public/images/og-image.webp"
    convert "$INPUT" -auto-orient -resize "2048x2048>" -quality 85 -define webp:method=6 "$DESKTOP"
    convert "$INPUT" -auto-orient -resize "1280x1280>" -quality 80 -define webp:method=6 "$MOBILE"
    convert "$INPUT" -auto-orient -resize "1200x630^" -gravity center -extent 1200x630 -quality 82 -define webp:method=6 "$OG"
    convert "$INPUT" -auto-orient -resize "180x180^" -gravity center -extent 180x180 png:- | convert - "$ROOT/public/apple-touch-icon.png"
    convert "$INPUT" -auto-orient -resize "32x32^" -gravity center -extent 32x32 png:- | convert - "$ROOT/public/favicon.ico"
    echo "Wrote $DESKTOP ($(du -h "$DESKTOP" | cut -f1))"
    echo "Wrote $MOBILE ($(du -h "$MOBILE" | cut -f1))"
    echo "Wrote $OG ($(du -h "$OG" | cut -f1))"
    echo "Wrote $ROOT/public/apple-touch-icon.png and favicon.ico"
    ;;
  work)
    BASENAME="${OUTPUT_NAME:-$(basename "$INPUT" | sed 's/\.[^.]*$//')}"
    OUT="$ROOT/public/images/works/${BASENAME}.webp"
    mkdir -p "$(dirname "$OUT")"
    convert "$INPUT" -auto-orient -resize "1200x1500^" -gravity center -extent 1200x1500 -quality 82 -define webp:method=6 "$OUT"
    echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
    echo "Add to src/data/works.ts with image: '/images/works/${BASENAME}.webp'"
    ;;
  *)
    echo "Unknown mode: $MODE (use background or work)"
    exit 1
    ;;
esac
