// YOLOv8 전/후처리 유틸 — onnxruntime-web용(입력 images[1,3,640,640], 출력 output0[1,84,8400]) - 2026-08-31
export const YOLO_SIZE = 640

// COCO 80 클래스(YOLOv8 기본 학습 순서)
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush',
]

// letterbox 전처리 — src 캔버스를 640 정사각(회색 패딩)으로 맞춰 CHW/RGB/0~1 텐서 생성 - 2026-08-31
export function preprocess(src, off) {
  const S = YOLO_SIZE
  if (off.width !== S) { off.width = S; off.height = S }
  const ctx = off.getContext('2d')
  ctx.fillStyle = 'rgb(114,114,114)'
  ctx.fillRect(0, 0, S, S)
  const sw = src.width, sh = src.height
  const scale = Math.min(S / sw, S / sh)
  const nw = Math.round(sw * scale), nh = Math.round(sh * scale)
  const padX = Math.floor((S - nw) / 2), padY = Math.floor((S - nh) / 2)
  ctx.drawImage(src, 0, 0, sw, sh, padX, padY, nw, nh)
  const { data } = ctx.getImageData(0, 0, S, S) // RGBA
  const area = S * S
  const out = new Float32Array(area * 3)
  for (let i = 0; i < area; i++) {
    out[i] = data[i * 4] / 255            // R plane
    out[area + i] = data[i * 4 + 1] / 255 // G plane
    out[2 * area + i] = data[i * 4 + 2] / 255 // B plane
  }
  return { data: out, scale, padX, padY }
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const uni = a.w * a.h + b.w * b.h - inter
  return uni > 0 ? inter / uni : 0
}

// 클래스별 NMS - 2026-08-31
function nms(boxes, iouThres, maxDet) {
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const keep = []
  while (sorted.length && keep.length < maxDet) {
    const b = sorted.shift()
    keep.push(b)
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].cls === b.cls && iou(b, sorted[i]) > iouThres) sorted.splice(i, 1)
    }
  }
  return keep
}

// COCO 17 keypoint 이름(YOLOv8-pose·MoveNet 공통 순서) - 2026-09-01
export const KP_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
  'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
]

// YOLOv8-pose output0[1,56,8400] 디코드 → [{x,y,w,h,score,keypoints:[{x,y,score,name}]}] - 2026-09-01
// 56 = 4(box) + 1(person conf) + 17*3(keypoint x,y,conf)
export function postprocessPose(out, dims, meta, opts = {}) {
  const conf = opts.conf ?? 0.35, iouThres = opts.iou ?? 0.45, maxDet = opts.maxDet ?? 20
  const na = dims[2]
  const { scale, padX, padY } = meta
  const dets = []
  for (let i = 0; i < na; i++) {
    const score = out[4 * na + i]
    if (score < conf) continue
    const cx = out[i], cy = out[na + i], w = out[2 * na + i], h = out[3 * na + i]
    const x = (cx - w / 2 - padX) / scale
    const y = (cy - h / 2 - padY) / scale
    const keypoints = []
    for (let k = 0; k < 17; k++) {
      const base = (5 + k * 3) * na + i
      keypoints.push({
        x: (out[base] - padX) / scale,
        y: (out[base + na] - padY) / scale,
        score: out[base + 2 * na],
        name: KP_NAMES[k],
      })
    }
    dets.push({ x, y, w: w / scale, h: h / scale, cls: 0, score, keypoints })
  }
  return nms(dets, iouThres, maxDet)
}

// output0[1,84,8400] 디코드 → 원본 좌표 detection 배열 [{x,y,w,h,cls,score}] - 2026-08-31
export function postprocess(out, dims, meta, opts = {}) {
  const conf = opts.conf ?? 0.35, iouThres = opts.iou ?? 0.45, maxDet = opts.maxDet ?? 100
  const na = dims[2]           // 8400 anchors
  const numClasses = dims[1] - 4
  const { scale, padX, padY } = meta
  const boxes = []
  for (let i = 0; i < na; i++) {
    let best = 0, bestC = 0
    for (let c = 0; c < numClasses; c++) {
      const s = out[(4 + c) * na + i]
      if (s > best) { best = s; bestC = c }
    }
    if (best < conf) continue
    const cx = out[i], cy = out[na + i], w = out[2 * na + i], h = out[3 * na + i]
    const x = (cx - w / 2 - padX) / scale
    const y = (cy - h / 2 - padY) / scale
    boxes.push({ x, y, w: w / scale, h: h / scale, cls: bestC, score: best })
  }
  return nms(boxes, iouThres, maxDet)
}
