import cv2
import numpy as np
import onnxruntime as ort
from config import STORAGE_PATH

WEIGHTS_PATH = STORAGE_PATH / "weights"
ENCODER_PATH = str(WEIGHTS_PATH / "sam2.1_hiera_tiny.encoder.onnx")
DECODER_PATH = str(WEIGHTS_PATH / "sam2.1_hiera_tiny.decoder.onnx")

_encoder = None
_decoder = None
_encoder_input_size = None


def _get_sessions():
    global _encoder, _decoder, _encoder_input_size
    if _encoder is None:
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        providers = ["CPUExecutionProvider"]
        _encoder = ort.InferenceSession(ENCODER_PATH, opts, providers=providers)
        _decoder = ort.InferenceSession(DECODER_PATH, opts, providers=providers)
        # Encoder input shape: [1, 3, H, W]
        shape = _encoder.get_inputs()[0].shape
        _encoder_input_size = (shape[2], shape[3])
    return _encoder, _decoder, _encoder_input_size


def _encode_image(encoder, img_bgr, input_size):
    """Preprocess + encode → 3 feature tensors."""
    h, w = input_size
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (w, h))

    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img = (img / 255.0 - mean) / std

    tensor = img.transpose(2, 0, 1)[None, :, :, :].astype(np.float32)

    input_name = encoder.get_inputs()[0].name
    outputs = encoder.run(None, {input_name: tensor})

    # 3 outputs: high_res_feats_0, high_res_feats_1, image_embedding
    return outputs[0], outputs[1], outputs[2]


def _decode_masks(
    decoder, high0, high1, embed, points, labels, encoder_input_size, orig_size
):
    """Run decoder with prompts."""
    orig_h, orig_w = orig_size
    enc_h, enc_w = encoder_input_size

    # Normalize coordinates
    coords = points.copy().astype(np.float32)
    coords[..., 0] = coords[..., 0] / orig_w * enc_w
    coords[..., 1] = coords[..., 1] / orig_h * enc_h

    # Add batch dimension: (1, N, 2) and (1, N)
    coords = coords[None, ...].astype(np.float32)
    labels = labels[None, ...].astype(np.float32)

    num_labels = labels.shape[0]
    scale_factor = 4
    mask_input = np.zeros(
        (num_labels, 1, enc_h // scale_factor, enc_w // scale_factor),
        dtype=np.float32,
    )
    has_mask_input = np.array([0], dtype=np.float32)

    # Decoder inputs in order: embed, high0, high1, coords, labels, mask, has_mask
    input_names = [inp.name for inp in decoder.get_inputs()]
    inputs = [embed, high0, high1, coords, labels, mask_input, has_mask_input]

    outputs = decoder.run(None, dict(zip(input_names, inputs)))

    # outputs[0] = masks, outputs[1] = scores
    masks = outputs[0][0]
    scores = outputs[1].squeeze()
    best_mask = masks[scores.argmax()]

    # Resize to original
    best_mask = cv2.resize(best_mask, (orig_w, orig_h))
    return best_mask


def refine_contour(
    image_path: str,
    points: list[dict],
    epsilon: float = 2.0,
    padding: int = 50,
) -> list[dict]:
    img = cv2.imread(image_path)
    if img is None:
        return points

    encoder, decoder, enc_size = _get_sessions()
    orig_h, orig_w = img.shape[:2]

    # Encode
    high0, high1, embed = _encode_image(encoder, img, enc_size)

    # Bbox из полигона → rectangle prompt (labels 2, 3)
    pts = np.array([[int(p["x"]), int(p["y"])] for p in points], dtype=np.float32)
    x_min, y_min = pts.min(axis=0)
    x_max, y_max = pts.max(axis=0)

    prompt_points = np.array([[x_min, y_min], [x_max, y_max]], dtype=np.float32)
    prompt_labels = np.array([2, 3], dtype=np.float32)

    # Decode
    mask = _decode_masks(
        decoder,
        high0,
        high1,
        embed,
        prompt_points,
        prompt_labels,
        enc_size,
        (orig_h, orig_w),
    )

    # Mask → contour
    mask_uint8 = (mask > 0.0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(
        mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return points

    largest = max(contours, key=cv2.contourArea)
    simplified = cv2.approxPolyDP(largest, epsilon, closed=True)

    return [{"x": int(pt[0][0]), "y": int(pt[0][1])} for pt in simplified]
