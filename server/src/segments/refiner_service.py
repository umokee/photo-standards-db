import cv2 as cv
import numpy as np


def _clip_point(x: int, y: int, w: int, h: int) -> tuple[int, int]:
    return max(0, min(x, w - 1)), max(0, min(y, h - 1))


def _adaptive_epsilon(points: np.ndarray) -> float:
    contour = points.reshape((-1, 1, 2)).astype(np.int32)
    perimeter = cv.arcLength(contour, closed=True)
    return max(1.2, min(perimeter * 0.004, 4.0))


def _simplify_contour(points: np.ndarray) -> np.ndarray:
    if len(points) < 3:
        return points
    contour = points.reshape((-1, 1, 2)).astype(np.int32)
    epsilon = _adaptive_epsilon(points)
    approx = cv.approxPolyDP(contour, epsilon=epsilon, closed=True)
    return approx.reshape((-1, 2))


def _refine_once(image: np.ndarray, pts: np.ndarray, padding: int) -> np.ndarray:
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

    # Hard-constrain refinement to the original polygon area: everything
    # outside stays background, refinement only resolves details inside.
    mask = np.full((crop_h, crop_w), cv.GC_BGD, dtype=np.uint8)
    cv.fillPoly(mask, [local_pts], cv.GC_PR_FGD)

    kernel_size = max(3, padding // 12)
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, (kernel_size, kernel_size))
    inner = np.zeros((crop_h, crop_w), dtype=np.uint8)
    cv.fillPoly(inner, [local_pts], 1)
    inner = cv.erode(inner, kernel)
    mask[inner == 1] = cv.GC_FGD

    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)

    cv.grabCut(crop, mask, None, bgd, fgd, 8, cv.GC_INIT_WITH_MASK)

    fg = np.where((mask == cv.GC_FGD) | (mask == cv.GC_PR_FGD), 255, 0).astype(np.uint8)

    # Smooth small dents and tiny holes before extracting the final contour.
    smooth_kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, (5, 5))
    fg = cv.morphologyEx(fg, cv.MORPH_CLOSE, smooth_kernel)
    fg = cv.GaussianBlur(fg, (5, 5), 0)
    _, fg = cv.threshold(fg, 127, 255, cv.THRESH_BINARY)

    contours, _ = cv.findContours(fg, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not contours:
        return pts

    best = max(contours, key=cv.contourArea).reshape((-1, 2))
    best[:, 0] += x_min
    best[:, 1] += y_min
    return best.astype(np.int32)


def refine_contour(
    image_path: str,
    points: list[list[int]],
    padding: int = 60,
) -> list[list[int]]:
    image = cv.imread(image_path, cv.IMREAD_COLOR)
    if image is None:
        raise ValueError("Не удалось загрузить изображение")
    if len(points) < 3:
        return points

    current = np.array(points, dtype=np.int32)

    try:
        for _ in range(4):
            previous = current
            current = _refine_once(image, previous, padding)
            if current.shape == previous.shape:
                mean_shift = np.linalg.norm(current - previous, axis=1).mean()
                if mean_shift < 1.5:
                    break
    except cv.error:
        return points

    simplified = _simplify_contour(current)
    return simplified.astype(int).tolist()
