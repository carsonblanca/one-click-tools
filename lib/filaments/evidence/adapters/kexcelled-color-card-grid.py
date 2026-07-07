#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


def clusters(values: list[int], gap: int) -> list[list[int]]:
    result: list[list[int]] = []
    for value in values:
        if not result or value - result[-1][-1] > gap:
            result.append([value])
        else:
            result[-1].append(value)
    return result


def main() -> int:
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    asset_id = sys.argv[3]
    output.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGB")
    width, height = image.size
    sample = image.copy()
    sample.thumbnail((900, 1400))
    sx, sy = sample.size
    pixels = sample.load()

    active_y: list[int] = []
    for y in range(sy):
        count = sum(1 for x in range(sx) if max(pixels[x, y]) - min(pixels[x, y]) > 28)
        if count / max(1, sx) > 0.08:
            active_y.append(y)

    y_groups = [group for group in clusters(active_y, max(2, sy // 220)) if len(group) >= max(3, sy // 160)]
    y_centers = [sum(group) // len(group) for group in y_groups]

    cards: list[dict[str, object]] = []
    if len(y_centers) >= 2:
        y_bounds = [max(0, y_centers[0] - (y_centers[1] - y_centers[0]) // 2)]
        y_bounds += [(a + b) // 2 for a, b in zip(y_centers, y_centers[1:])]
        y_bounds.append(min(sy, y_centers[-1] + (y_centers[-1] - y_centers[-2]) // 2))
        scale_x, scale_y = width / sx, height / sy
        for row in range(len(y_bounds) - 1):
            row_top, row_bottom = y_bounds[row], y_bounds[row + 1]
            active_x: list[int] = []
            for x in range(sx):
                count = sum(
                    1
                    for y in range(row_top, row_bottom)
                    if max(pixels[x, y]) - min(pixels[x, y]) > 28
                )
                if count / max(1, row_bottom - row_top) > 0.1:
                    active_x.append(x)
            x_groups = [
                group
                for group in clusters(active_x, max(2, sx // 180))
                if len(group) >= max(3, sx // 120)
            ]
            x_centers = [sum(group) // len(group) for group in x_groups]
            if len(x_centers) < 2:
                continue
            x_bounds = [max(0, x_centers[0] - (x_centers[1] - x_centers[0]) // 2)]
            x_bounds += [(a + b) // 2 for a, b in zip(x_centers, x_centers[1:])]
            x_bounds.append(min(sx, x_centers[-1] + (x_centers[-1] - x_centers[-2]) // 2))
            for column in range(len(x_bounds) - 1):
                left, right = x_bounds[column], x_bounds[column + 1]
                top, bottom = row_top, row_bottom
                if right - left < sx * 0.08 or bottom - top < sy * 0.05:
                    continue
                rect = [
                    round(left * scale_x),
                    round(top * scale_y),
                    round(right * scale_x),
                    round(bottom * scale_y),
                ]
                crop_id = f"{asset_id}-r{row + 1:02d}-c{column + 1:02d}"
                crop_path = output / f"{crop_id}.png"
                image.crop(tuple(rect)).save(crop_path, "PNG")
                cards.append({
                    "cropAssetId": crop_id,
                    "cropFilename": crop_path.name,
                    "rowIndex": row,
                    "columnIndex": column,
                    "cropRect": rect,
                    "cropConfidence": 0.72,
                })

    print(json.dumps({
        "sourceWidth": width,
        "sourceHeight": height,
        "cards": cards,
        "status": "detected" if cards else "needs_manual_review",
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
