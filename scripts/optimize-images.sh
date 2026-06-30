#!/usr/bin/env bash
# Optimize images for Nineville Studio.
# Requires ImageMagick (`convert`).
#
# Usage:
#   ./scripts/optimize-images.sh hero path/to/photo.jpg
#   ./scripts/optimize-images.sh work path/to/painting.jpg [output-name]
#
# Hero: max 1920px, WebP ~78 quality → public/images/hero_background.webp
# Work:  cropped to 4:5 at 1200×1500, WebP ~82 quality → public/images/works/

set -euo pipefail

MODE="${1:-}"
INPUT="${2:-}"
OUTPUT_NAME="${3:-}"

if [[ -z "$MODE" || -z "$INPUT" ]]; then
  echo "Usage: $0 hero <file.jpg> | work <file.jpg> [output-name]"
  exit 1
fi

if ! command -v convert &>/dev/null; then
  echo "ImageMagick (convert) is required."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$MODE" in
  hero)
    OUT="$ROOT/public/images/hero_background.webp"
    convert "$INPUT" -auto-orient -resize "1920x1920>" -quality 78 -define webp:method=6 "$OUT"
    echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
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
    echo "Unknown mode: $MODE (use hero or work)"
    exit 1
    ;;
esac
