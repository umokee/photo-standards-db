""" ""
Подход 1: GrabCut с жёстким поводком.
Оригинальная логика GrabCut, но результат обрезается:
  - не может расшириться дальше max_grow_px от полигона
  - не может сжаться глубже max_shrink_px внутрь полигона
  - если площадь результата бредовая (< 40% или > 250% оригинала) — возврат как есть
"""

import cv2 as cv
import numpy as np

# ── helpers ──────────────────────────────────────────────────────────────


def _adaptive_epsilon(points: np.ndarray) -> float:
    contour = points.reshape((-1, 1, 2)).astype(np.int32)
    perimeter = cv.arcLength(contour, closed=True)
    return max(1.2, min(perimeter * 0.004, 4.0))


def _shell_size(points: np.ndarray) -> int:
    width = int(points[:, 0].max() - points[:, 0].min())
    height = int(points[:, 1].max() - points[:, 1].min())
    min_dim = max(1, min(width, height))
    return max(4, min(18, int(round(min_dim * 0.04))))


def _simplify_contour(points: np.ndarray) -> np.ndarray:
    if len(points) < 3:
        return points
    contour = points.reshape((-1, 1, 2)).astype(np.int32)
    epsilon = _adaptive_epsilon(points)
    approx = cv.approxPolyDP(contour, epsilon=epsilon, closed=True)
    return approx.reshape((-1, 2))


# ── core ─────────────────────────────────────────────────────────────────


def _refine_once(
    image: np.ndarray,
    pts: np.ndarray,
    padding: int,
    max_grow_px: int,
    max_shrink_px: int,
) -> np.ndarray:
    h, w = image.shape[:2]

    x_min = max(0, int(pts[:, 0].min()) - padding)
    y_min = max(0, int(pts[:, 1].min()) - padding)
    x_max = min(w, int(pts[:, 0].max()) + padding)
    y_max = min(h, int(pts[:, 1].max()) + padding)

    crop = image[y_min:y_max, x_min:x_max].copy()
    crop_h, crop_w = crop.shape[:2]

    local_pts = pts.copy()
    local_pts[:, 0] -= x_min
    local_pts[:, 1] -= y_min

    # ── маска для GrabCut ────────────────────────────────────────────
    polygon = np.zeros((crop_h, crop_w), dtype=np.uint8)
    cv.fillPoly(polygon, [local_pts], 1)

    mask = np.full((crop_h, crop_w), cv.GC_BGD, dtype=np.uint8)

    shell_size = _shell_size(local_pts)
    outer_kernel = cv.getStructuringElement(
        cv.MORPH_ELLIPSE, (shell_size * 2 + 1, shell_size * 2 + 1)
    )
    outer = cv.dilate(polygon, outer_kernel)
    shell = cv.subtract(outer, polygon)

    mask[shell == 1] = cv.GC_PR_BGD
    mask[polygon == 1] = cv.GC_PR_FGD

    kernel_size = max(3, padding // 12)
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, (kernel_size, kernel_size))
    inner = cv.erode(polygon, kernel)
    mask[inner == 1] = cv.GC_FGD

    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv.grabCut(crop, mask, None, bgd, fgd, 8, cv.GC_INIT_WITH_MASK)

    fg = np.where((mask == cv.GC_FGD) | (mask == cv.GC_PR_FGD), 255, 0).astype(np.uint8)

    # ── сглаживание мелких дыр ───────────────────────────────────────
    smooth_kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, (5, 5))
    fg = cv.morphologyEx(fg, cv.MORPH_CLOSE, smooth_kernel)
    fg = cv.GaussianBlur(fg, (5, 5), 0)
    _, fg = cv.threshold(fg, 127, 255, cv.THRESH_BINARY)

    # ── ЗАБОР: не даём расползаться ──────────────────────────────────
    grow_kernel = cv.getStructuringElement(
        cv.MORPH_ELLIPSE, (max_grow_px * 2 + 1, max_grow_px * 2 + 1)
    )
    allowed_zone = cv.dilate(polygon, grow_kernel) * 255
    fg = cv.bitwise_and(fg, allowed_zone)

    # ── ЗАБОР: не даём сжирать ───────────────────────────────────────
    shrink_kernel = cv.getStructuringElement(
        cv.MORPH_ELLIPSE, (max_shrink_px * 2 + 1, max_shrink_px * 2 + 1)
    )
    guaranteed_zone = cv.erode(polygon, shrink_kernel) * 255
    fg = cv.bitwise_or(fg, guaranteed_zone)

    # ── проверка адекватности ────────────────────────────────────────
    original_area = cv.countNonZero(polygon)
    result_area = cv.countNonZero(fg)
    ratio = result_area / max(original_area, 1)
    if ratio < 0.4 or ratio > 2.5:
        return pts

    # ── извлечение контура ───────────────────────────────────────────
    contours, _ = cv.findContours(fg, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not contours:
        return pts

    best = max(contours, key=cv.contourArea).reshape((-1, 2))
    best[:, 0] += x_min
    best[:, 1] += y_min
    return best.astype(np.int32)


# ── public API ───────────────────────────────────────────────────────────


def refine_contour(
    image_path: str,
    points: list[list[int]],
    padding: int = 60,
    max_grow_px: int = 25,
    max_shrink_px: int = 15,
) -> list[list[int]]:
    """
    Уточняет полигон через GrabCut с ограничением расширения/сжатия.

    Args:
        image_path:    путь к изображению
        points:        [[x, y], ...] — исходный полигон (≥ 3 точек)
        padding:       отступ вокруг полигона для кропа
        max_grow_px:   максимум пикселей наружу от исходного полигона
        max_shrink_px: максимум пикселей внутрь (гарантированный минимум)

    Returns:
        [[x, y], ...] — уточнённый полигон
    """
    image = cv.imread(image_path, cv.IMREAD_COLOR)
    if image is None:
        raise ValueError("Не удалось загрузить изображение")

    if len(points) < 3:
        return points

    current = np.array(points, dtype=np.int32)

    try:
        for _ in range(4):
            previous = current
            current = _refine_once(image, previous, padding, max_grow_px, max_shrink_px)
            if current.shape == previous.shape:
                mean_shift = np.linalg.norm(current - previous, axis=1).mean()
                if mean_shift < 1.5:
                    break
    except cv.error:
        return points

    simplified = _simplify_contour(current)
    return simplified.astype(int).tolist()
