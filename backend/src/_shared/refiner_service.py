import cv2 as cv
import numpy as np


def _clip_point(x: int, y: int, w: int, h: int) -> tuple[int, int]:
    return max(0, min(x, w - 1)), max(0, min(y, h - 1))


def _simplify_contour(points: np.ndarray, epsilon: float) -> np.ndarray:
    if len(points) < 3:
        return points
    contour = points.reshape((-1, 1, 2)).astype(np.int32)
    approx = cv.approxPolyDP(contour, epsilon=epsilon, closed=True)
    return approx.reshape((-1, 2))


def refine_contour(
    image_path: str,
    points: list[list[int]],
    padding: int = 20,
    epsilon: float = 2.0,
) -> list[list[int]]:
    image = cv.imread(image_path, cv.IMREAD_COLOR)
    if image is None:
        raise ValueError("Не удалось загрузить изображение")
    if len(points) < 3:
        return points

    pts = np.array(points, dtype=np.int32)
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

    # Маска для GrabCut
    mask = np.full((crop_h, crop_w), cv.GC_BGD, dtype=np.uint8)

    # Внутри полигона — вероятный передний план
    cv.fillPoly(mask, [local_pts], cv.GC_PR_FGD)

    # Эродированное ядро — точно передний план
    kernel_size = max(3, padding // 3)
    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, (kernel_size, kernel_size))
    inner = np.zeros((crop_h, crop_w), dtype=np.uint8)
    cv.fillPoly(inner, [local_pts], 1)
    inner = cv.erode(inner, kernel)
    mask[inner == 1] = cv.GC_FGD

    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)

    try:
        cv.grabCut(crop, mask, None, bgd, fgd, 3, cv.GC_INIT_WITH_MASK)
    except cv.error:
        return points

    fg = np.where((mask == cv.GC_FGD) | (mask == cv.GC_PR_FGD), 255, 0).astype(np.uint8)

    contours, _ = cv.findContours(fg, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not contours:
        return points

    best = max(contours, key=cv.contourArea).reshape((-1, 2))
    simplified = _simplify_contour(best, epsilon)

    simplified[:, 0] += x_min
    simplified[:, 1] += y_min

    return simplified.astype(int).tolist()
