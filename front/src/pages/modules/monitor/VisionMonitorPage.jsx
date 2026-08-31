// AI 비전 관제 — 폰 카메라 실시간 영상 수신(WebSocket) + 분석 오버레이 - 2026-08-02
// 모드: 사물감지(COCO-SSD) / 자세·행동(MoveNet). 사람 자동 줌인 토글 공용.
//   얼굴인식(face-api)은 코드 보존하되 UI 숨김(추후 재활성) - 2026-08-31
import { useEffect, useRef, useState } from 'react'
import QRCodeLib from 'qrcode'
import { Camera, Wifi, WifiOff, Loader2, Cpu, AlertTriangle, Check, Ban, Boxes, ScanFace, UserPlus, Trash2, Upload, PersonStanding, ZoomIn, SeparatorVertical, RotateCcw } from 'lucide-react'
import * as ort from 'onnxruntime-web/wasm'  // wasm 전용 빌드(non-jsep) - 2026-08-31
// Vite ?url 에셋 import — public 우회, dev/빌드 모두 정상 로드 - 2026-08-31
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { wsUrl } from '../../../constants/api'
import { useLanguage } from '../../../context/LanguageContext'
import { COCO_CLASSES, preprocess, postprocess, postprocessPose } from './yolo'
import { Tracker } from './tracker'

// onnxruntime-web — 로컬 wasm(CSP self) + 단일 스레드(크로스오리진 격리 불필요) - 2026-08-31
ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl }
ort.env.wasm.numThreads = 1
const YOLO_MODEL_URL = '/models/yolo/yolov8n.onnx'

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin
const camUrl = (room) => `${PUBLIC_BASE}/#/m/cam?room=${encodeURIComponent(room)}`

// 감지 박스 색상 팔레트(클래스별 순환) - 2026-08-02
const BOX_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#f87171']
const colorFor = (cls) => {
  let h = 0
  for (let i = 0; i < cls.length; i++) h = (h + cls.charCodeAt(i)) % BOX_COLORS.length
  return BOX_COLORS[h]
}

// ── 얼굴 인식 설정(숨김 상태, 코드 보존) - 2026-08-31 ──
const FACE_KEY = 'mes-faces'
const FACE_THRESHOLD = 0.55
const FACE_MODEL_URL = '/models/faceapi'
const KNOWN_COLOR = '#34d399'
const UNKNOWN_COLOR = '#f87171'
const loadFaces = () => { try { return JSON.parse(localStorage.getItem(FACE_KEY)) || [] } catch { return [] } }
const saveFaces = (list) => { try { localStorage.setItem(FACE_KEY, JSON.stringify(list)) } catch { /* noop */ } }
const euclid = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d } return Math.sqrt(s) }
const loadImage = (file) => new Promise((res, rej) => {
  const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file)
})

// ── 자세·행동 인식(YOLOv8-pose, onnxruntime-web) 설정 - 2026-09-01 ──
const POSE_MODEL_URL = '/models/yolo/yolov8n-pose.onnx'
const POSE_MIN_SCORE = 0.3
// MoveNet 17 keypoint 골격 연결쌍
const SKELETON = [
  ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'], ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
]

// 자세 → 행동 분류(간단 규칙) - 2026-08-31
const classifyAction = (keypoints) => {
  const kp = {}; keypoints.forEach((k) => { kp[k.name] = k })
  const up = (w, s) => w && s && w.score > POSE_MIN_SCORE && s.score > POSE_MIN_SCORE && w.y < s.y
  const lUp = up(kp.left_wrist, kp.left_shoulder)
  const rUp = up(kp.right_wrist, kp.right_shoulder)
  if (lUp && rUp) return 'both'
  if (lUp || rUp) return 'one'
  return 'stand'
}

// 크롭 사각형 생성(줌 대상 bbox를 화면 비율에 맞춰 확장·클램프) - 2026-08-31
const buildCrop = (bx, by, bw, bh, srcW, srcH, margin = 1.7) => {
  const cx = bx + bw / 2, cy = by + bh / 2
  const aspect = srcW / srcH
  let h = Math.min(srcH, bh * margin)
  let w = h * aspect
  if (w < bw * margin) { w = Math.min(srcW, bw * margin); h = w / aspect }
  if (w > srcW) { w = srcW; h = w / aspect }
  if (h > srcH) { h = srcH; w = h * aspect }
  let x = cx - w / 2, y = cy - h / 2
  x = Math.max(0, Math.min(x, srcW - w))
  y = Math.max(0, Math.min(y, srcH - h))
  return { x, y, w, h }
}
const lerpRect = (a, b, t) => a ? {
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t,
} : b

export default function VisionMonitorPage() {
  const { t, lang } = useLanguage()
  const room = 'default'

  // 신규 UI 문구 — 자체 이중언어 맵 - 2026-08-31
  const FT = lang === 'ko' ? {
    modeObject: '사물 감지', modePose: '자세·행동', modeFace: '얼굴 인식',
    autoZoom: '사람 자동 줌인',
    poseLoading: '자세 모델 로딩', poseReady: '자세 인식 준비됨', poseError: '자세 모델 오류',
    actStand: '서 있음', actOne: '한 손 들기', actBoth: '양손 들기(만세)',
    noPerson: '사람 없음', action: '행동', persons: '사람',
    faceLoading: '얼굴 모델 로딩', faceReady: '얼굴 인식 준비됨', faceError: '얼굴 모델 오류',
    register: '얼굴 등록', namePh: '이름 입력', capture: '라이브 캡처', upload: '사진 업로드',
    registered: '등록된 얼굴', none: '등록된 얼굴이 없습니다', unknown: '미등록',
    noFace: '화면에서 얼굴을 찾지 못했습니다', needName: '이름을 먼저 입력하세요',
    hint: '이름 입력 후, 화면에 얼굴이 보일 때 라이브 캡처하거나 사진을 업로드하세요.',
    live: '실시간 인식', enrolled: '명 등록됨', delete: '삭제',
    count: '현재 객체', lineCount: '라인 통과 카운트', toRight: '→ 우측', toLeft: '← 좌측',
    reset: '초기화', trackingN: '추적 중',
    customNote: '커스텀 부품·불량은 학습한 YOLO .onnx를 public/models/yolo에 넣고 클래스명을 교체하세요.',
  } : {
    modeObject: 'Objects', modePose: 'Pose', modeFace: 'Faces',
    autoZoom: 'Auto zoom to person',
    poseLoading: 'Loading pose model', poseReady: 'Pose ready', poseError: 'Pose model error',
    actStand: 'Standing', actOne: 'One hand up', actBoth: 'Both hands up',
    noPerson: 'No person', action: 'Action', persons: 'Person(s)',
    faceLoading: 'Loading face models', faceReady: 'Face recognition ready', faceError: 'Face model error',
    register: 'Enroll face', namePh: 'Enter name', capture: 'Live capture', upload: 'Upload photo',
    registered: 'Enrolled faces', none: 'No enrolled faces', unknown: 'Unknown',
    noFace: 'No face found on screen', needName: 'Enter a name first',
    hint: 'Type a name, then live-capture when a face is visible or upload a photo.',
    live: 'Live recognition', enrolled: ' enrolled', delete: 'Delete',
    count: 'Objects now', lineCount: 'Line-crossing count', toRight: '→ Right', toLeft: '← Left',
    reset: 'Reset', trackingN: 'Tracking',
    customNote: 'For custom parts/defects, put your trained YOLO .onnx in public/models/yolo and swap class names.',
  }
  const actionLabel = (a) => a === 'both' ? FT.actBoth : a === 'one' ? FT.actOne : a === 'stand' ? FT.actStand : FT.noPerson

  const viewRef  = useRef(null)   // 화면 표시 캔버스(영상 + 오버레이)
  const rawRef   = useRef(null)   // 분석용 원본 캔버스(오프스크린, 항상 풀프레임)
  const wsRef    = useRef(null)
  const modelRef = useRef(null)   // YOLOv8 onnx 세션
  const predsRef = useRef([])
  const offRef   = useRef(null)   // YOLO 전처리용 640 오프스크린 캔버스
  const trackerRef = useRef(null) // 라인 통과 트래커
  const lineOnRef  = useRef(false)
  const poseOnRef  = useRef(false) // 자세·행동 오버레이 on/off
  const tickRef    = useRef(0)     // 프레임 교대(사물/자세) 카운터
  const runningRef = useRef(true)
  const frameCntRef = useRef(0)
  const hasFrameRef    = useRef(false)
  const approvalRef    = useRef('none')

  const modeRef  = useRef('object')
  const busyRef  = useRef(false)

  // 사람 자동 줌인 - 2026-08-31
  const autoZoomRef = useRef(false)
  const zoomRef = useRef(null)     // 현재 크롭 사각형(소스px), 애니메이션용

  // 자세·행동(MoveNet) - 2026-08-31
  const poseDetRef = useRef(null)
  const posesRef = useRef([])

  // 얼굴 인식(숨김, 코드 보존) - 2026-08-31
  const faceApiRef = useRef(null)
  const faceDetsRef = useRef([])
  const registeredRef = useRef([])

  const [approval,   setApprovalState] = useState('none')
  const [pubOnline,  setPubOnline]     = useState(false)
  const [hasFrame,   setHasFrame]   = useState(false)
  const [modelState, setModelState] = useState('loading')
  const [modelErr,   setModelErr]   = useState('')
  const [preds,      setPreds]      = useState([])
  const [qrData,     setQrData]     = useState(null)
  const [fps,        setFps]        = useState(0)

  const [mode] = useState('object')  // 'object' 고정 — 자세는 poseOn 토글, 얼굴은 숨김 - 2026-09-01
  const [autoZoom,   setAutoZoom]   = useState(false)
  const [lineOn,     setLineOn]     = useState(false)     // 라인 통과 카운트
  const [poseOn,     setPoseOn]     = useState(false)     // 자세·행동 오버레이
  const [counts,     setCounts]     = useState({ ltr: 0, rtl: 0, tracks: 0 })

  const [poseState,  setPoseState]  = useState('idle')
  const [poseErr,    setPoseErr]    = useState('')
  const [poseInfo,   setPoseInfo]   = useState({ count: 0, action: null })

  const [faceState,  setFaceState]  = useState('idle')
  const [faceErr,    setFaceErr]    = useState('')
  const [registered, setRegistered] = useState(() => loadFaces())
  const [regName,    setRegName]    = useState('')
  const [faceDets,   setFaceDets]   = useState([])
  const [busyReg,    setBusyReg]    = useState(false)
  const [faceMsg,    setFaceMsg]    = useState('')
  const fileRef = useRef(null)

  // refs 동기화 - 2026-08-31
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { autoZoomRef.current = autoZoom }, [autoZoom])
  useEffect(() => { lineOnRef.current = lineOn }, [lineOn])
  useEffect(() => { poseOnRef.current = poseOn }, [poseOn])
  useEffect(() => { registeredRef.current = registered }, [registered])

  // 폰 접속용 QR 생성 - 2026-08-02
  useEffect(() => {
    QRCodeLib.toDataURL(camUrl(room), { width: 220, margin: 2 }).then(setQrData).catch(() => {})
  }, [])

  // YOLOv8 모델 로드 — onnxruntime-web(로컬 onnx, wasm EP) - 2026-08-31
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const session = await ort.InferenceSession.create(YOLO_MODEL_URL, { executionProviders: ['wasm'] })
        if (cancelled) return
        modelRef.current = session
        offRef.current = document.createElement('canvas')
        trackerRef.current = new Tracker()
        setModelState('ready')
      } catch (e) {
        console.error('[VisionMonitor] YOLO 모델 로딩 실패:', e)
        if (!cancelled) { setModelErr(e?.message || String(e)); setModelState('error') }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // 자세 모델(YOLOv8-pose) 로드 — 자세·행동 토글 최초 ON 시(로컬 onnx, wasm EP) - 2026-09-01
  useEffect(() => {
    if (!poseOn || poseDetRef.current || poseState !== 'idle') return
    let cancelled = false
    ;(async () => {
      setPoseState('loading')
      try {
        const session = await ort.InferenceSession.create(POSE_MODEL_URL, { executionProviders: ['wasm'] })
        if (cancelled) return
        poseDetRef.current = session
        if (!offRef.current) offRef.current = document.createElement('canvas')
        setPoseState('ready')
      } catch (e) {
        console.error('[VisionMonitor] 자세 모델 로딩 실패:', e)
        if (!cancelled) { setPoseErr(e?.message || String(e)); setPoseState('error') }
      }
    })()
    return () => { cancelled = true }
  }, [poseOn, poseState])

  // 얼굴 모델 로드(숨김 상태라 실질 미사용, 코드 보존) - 2026-08-31
  useEffect(() => {
    if (mode !== 'face' || faceApiRef.current || faceState !== 'idle') return
    let cancelled = false
    ;(async () => {
      setFaceState('loading')
      try {
        const fa = await import('@vladmandic/face-api/dist/face-api.esm-nobundle.js')
        await fa.tf.ready()
        await fa.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL)
        await fa.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL)
        await fa.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL)
        if (cancelled) return
        faceApiRef.current = fa
        setFaceState('ready')
      } catch (e) {
        console.error('[VisionMonitor] 얼굴 모델 로딩 실패:', e)
        if (!cancelled) { setFaceErr(e?.message || String(e)); setFaceState('error') }
      }
    })()
    return () => { cancelled = true }
  }, [mode, faceState])

  // 현재 모드에서 '사람' bbox 추출(자동 줌 대상) - 2026-08-31
  const getPersonBBox = (w, h) => {
    if (poseOnRef.current && posesRef.current.length) {
      const big = posesRef.current.reduce((a, b) => (a.box.w * a.box.h >= b.box.w * b.box.h ? a : b))
      return big.box
    }
    // 가장 큰 person(사물 감지)
    const persons = predsRef.current.filter((p) => p.class === 'person')
    if (!persons.length) return null
    const big = persons.reduce((a, b) => (a.bbox[2] * a.bbox[3] >= b.bbox[2] * b.bbox[3] ? a : b))
    return { x: big.bbox[0], y: big.bbox[1], w: big.bbox[2], h: big.bbox[3] }
  }

  // 캔버스에 프레임 + 오버레이 그리기(모드/줌 반영) - 2026-08-02 / 줌·자세 2026-08-31
  const paint = (src, w, h) => {
    const raw = rawRef.current, view = viewRef.current
    if (!raw || !view || !w || !h) return
    if (raw.width !== w) { raw.width = w; raw.height = h; view.width = w; view.height = h }
    raw.getContext('2d').drawImage(src, 0, 0, w, h) // 분석용은 항상 풀프레임
    const ctx = view.getContext('2d')

    // 자동 줌 크롭 계산 - 2026-08-31
    const full = { x: 0, y: 0, w, h }
    let crop = full
    if (autoZoomRef.current && modeRef.current !== 'face') {
      const pb = getPersonBBox(w, h)
      const target = pb ? buildCrop(pb.x, pb.y, pb.w, pb.h, w, h) : full
      zoomRef.current = lerpRect(zoomRef.current, target, 0.18)
      crop = zoomRef.current
    } else {
      zoomRef.current = null
    }

    ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, view.width, view.height)
    const sx = view.width / crop.w, sy = view.height / crop.h
    const TX = (x) => (x - crop.x) * sx, TY = (y) => (y - crop.y) * sy

    ctx.lineWidth = 2
    ctx.font = '14px sans-serif'
    ctx.textBaseline = 'top'

    if (modeRef.current === 'face') {
      for (const d of faceDetsRef.current) {
        const col = d.known ? KNOWN_COLOR : UNKNOWN_COLOR
        ctx.strokeStyle = col
        ctx.strokeRect(TX(d.box.x), TY(d.box.y), d.box.w * sx, d.box.h * sy)
        const tw = ctx.measureText(d.label).width + 8
        ctx.fillStyle = col; ctx.fillRect(TX(d.box.x), Math.max(0, TY(d.box.y) - 18), tw, 18)
        ctx.fillStyle = '#0b0f14'; ctx.fillText(d.label, TX(d.box.x) + 4, Math.max(0, TY(d.box.y) - 17))
      }
    } else {
      // 사물 박스
      for (const p of predsRef.current) {
        const [x, y, bw, bh] = p.bbox
        const col = colorFor(p.class)
        ctx.strokeStyle = col; ctx.lineWidth = 2
        ctx.strokeRect(TX(x), TY(y), bw * sx, bh * sy)
        const label = `${p.class} ${Math.round(p.score * 100)}%`
        const tw = ctx.measureText(label).width + 8
        ctx.fillStyle = col; ctx.fillRect(TX(x), Math.max(0, TY(y) - 18), tw, 18)
        ctx.fillStyle = '#0b0f14'; ctx.fillText(label, TX(x) + 4, Math.max(0, TY(y) - 17))
      }
      // 라인 통과 카운트 — 세로 중앙선 + 트랙 ID - 2026-08-31
      if (lineOnRef.current) {
        const lx = TX(w / 2)
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([8, 6])
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, view.height); ctx.stroke(); ctx.setLineDash([])
        const trs = trackerRef.current?.tracks || []
        ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#fbbf24'
        for (const tr of trs) ctx.fillText(`#${tr.id}`, TX(tr.x) + 2, Math.max(0, TY(tr.y) - 30))
      }
      // 자세·행동 오버레이(토글) - 2026-09-01
      if (poseOnRef.current) {
        for (const pose of posesRef.current) {
          const kp = {}; pose.keypoints.forEach((k) => { kp[k.name] = k })
          if (pose.box) {
            ctx.strokeStyle = 'rgba(52,211,153,0.55)'; ctx.lineWidth = 1.5
            ctx.strokeRect(TX(pose.box.x), TY(pose.box.y), pose.box.w * sx, pose.box.h * sy)
          }
          ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2
          for (const [a, b] of SKELETON) {
            const p = kp[a], q = kp[b]
            if (p && q && p.score > POSE_MIN_SCORE && q.score > POSE_MIN_SCORE) {
              ctx.beginPath(); ctx.moveTo(TX(p.x), TY(p.y)); ctx.lineTo(TX(q.x), TY(q.y)); ctx.stroke()
            }
          }
          ctx.fillStyle = '#34d399'
          for (const k of pose.keypoints) {
            if (k.score > POSE_MIN_SCORE) { ctx.beginPath(); ctx.arc(TX(k.x), TY(k.y), 3, 0, Math.PI * 2); ctx.fill() }
          }
          const act = classifyAction(pose.keypoints)
          const label = actionLabel(act)
          const col = act === 'both' || act === 'one' ? '#fbbf24' : '#34d399'
          const anchorX = TX(kp.nose?.x ?? pose.keypoints[0]?.x ?? 0)
          const anchorY = TY((kp.nose?.y ?? pose.keypoints[0]?.y ?? 20)) - 26
          ctx.font = 'bold 15px sans-serif'
          const tw = ctx.measureText(label).width + 10
          ctx.fillStyle = col; ctx.fillRect(anchorX, Math.max(0, anchorY), tw, 20)
          ctx.fillStyle = '#0b0f14'; ctx.fillText(label, anchorX + 5, Math.max(0, anchorY) + 2)
        }
      }
    }

    // 줌 상태 표시
    if (autoZoomRef.current && zoomRef.current && (zoomRef.current.w < w - 2)) {
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(view.width - 60, view.height - 24, 52, 18)
      ctx.fillStyle = '#fff'; ctx.fillText('ZOOM', view.width - 54, view.height - 22)
    }
  }

  const markFrame = () => { if (!hasFrameRef.current) { hasFrameRef.current = true; setHasFrame(true) } }
  const setApproval = (v) => { approvalRef.current = v; setApprovalState(v) }

  const resetStream = () => {
    hasFrameRef.current = false; setHasFrame(false)
    predsRef.current = []; setPreds([])
    posesRef.current = []; setPoseInfo({ count: 0, action: null })
    faceDetsRef.current = []; setFaceDets([])
    zoomRef.current = null
    const view = viewRef.current
    if (view) view.getContext('2d')?.clearRect(0, 0, view.width, view.height)
  }

  // WebSocket 수신 + 분석 루프 - 2026-08-02
  useEffect(() => {
    runningRef.current = true
    const ws = new WebSocket(wsUrl(`/api/cam/ws?room=${encodeURIComponent(room)}&role=viewer`))
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onmessage = async (e) => {
      if (typeof e.data === 'string') {
        try {
          const m = JSON.parse(e.data)
          if (m.type === 'pub') {
            setPubOnline(!!m.online)
            if (m.online) { if (approvalRef.current !== 'allowed') setApproval('pending') }
            else { setApproval('none'); resetStream() }
          }
        } catch { /* noop */ }
        return
      }
      try {
        if (approvalRef.current !== 'allowed') return
        const bmp = await createImageBitmap(new Blob([e.data], { type: 'image/jpeg' }))
        if (!runningRef.current) return
        markFrame()
        frameCntRef.current += 1
        paint(bmp, bmp.width, bmp.height)
        bmp.close?.()
      } catch { /* 디코드 실패 무시 */ }
    }

    // 분석 루프 — 모드별(사물/자세/얼굴) - 2026-08-02 / 자세 2026-08-31
    const detect = async () => {
      if (!runningRef.current) return
      const raw = rawRef.current
      if (raw && raw.width > 0) {
        const m = modeRef.current
        if (m === 'face') {
          const fa = faceApiRef.current
          if (fa && !busyRef.current) {
            busyRef.current = true
            try {
              const opts = new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
              const results = await fa.detectAllFaces(raw, opts).withFaceLandmarks().withFaceDescriptors()
              const reg = registeredRef.current
              const dets = results.map((r) => {
                const b = r.detection.box
                let best = null, bestD = Infinity
                for (const p of reg) { const d = euclid(r.descriptor, p.descriptor); if (d < bestD) { bestD = d; best = p } }
                const known = !!best && bestD < FACE_THRESHOLD
                return { box: { x: b.x, y: b.y, w: b.width, h: b.height }, label: known ? best.name : FT.unknown, known, descriptor: Array.from(r.descriptor) }
              })
              faceDetsRef.current = dets; setFaceDets(dets)
            } catch { /* noop */ }
            busyRef.current = false
          }
        } else if (!busyRef.current && offRef.current) {
          // 사물 + 자세(토글) 통합 — 한 프레임엔 하나만 추론(교대)해 WASM 부하 완화 - 2026-09-01
          tickRef.current = (tickRef.current + 1) % 1000
          const runPose = poseOnRef.current && poseDetRef.current && (tickRef.current % 2 === 0)
          busyRef.current = true
          try {
            const { data, scale, padX, padY } = preprocess(raw, offRef.current)
            const tensor = new ort.Tensor('float32', data, [1, 3, 640, 640])
            if (runPose) {
              const s = poseDetRef.current
              const res = await s.run({ [s.inputNames[0] || 'images']: tensor })
              const out = res[s.outputNames[0]]
              const poses = postprocessPose(out.data, out.dims, { scale, padX, padY }, { conf: 0.35, iou: 0.45 })
              posesRef.current = poses.map((p) => ({ keypoints: p.keypoints, box: { x: p.x, y: p.y, w: p.w, h: p.h }, score: p.score }))
              setPoseInfo({ count: poses.length, action: poses[0] ? classifyAction(poses[0].keypoints) : null })
            } else {
              const s = modelRef.current
              if (s) {
                const res = await s.run({ [s.inputNames[0] || 'images']: tensor })
                const out = res[s.outputNames[0]]
                const dets = postprocess(out.data, out.dims, { scale, padX, padY }, { conf: 0.35, iou: 0.45 })
                predsRef.current = dets.map((d) => ({ bbox: [d.x, d.y, d.w, d.h], class: COCO_CLASSES[d.cls] || String(d.cls), score: d.score }))
                setPreds(predsRef.current)
                if (lineOnRef.current && trackerRef.current) {
                  trackerRef.current.update(dets, raw.width / 2)
                  setCounts({ ...trackerRef.current.counts, tracks: trackerRef.current.tracks.length })
                }
              }
            }
          } catch { /* noop */ }
          busyRef.current = false
        }
      }
      if (runningRef.current) setTimeout(detect, 130)
    }
    detect()

    const fpsTimer = setInterval(() => { setFps(frameCntRef.current); frameCntRef.current = 0 }, 1000)

    return () => {
      runningRef.current = false
      clearInterval(fpsTimer)
      try { ws.close() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 얼굴 등록(숨김 상태, 코드 보존) - 2026-08-31
  const registerFromLive = () => {
    const name = regName.trim()
    if (!name) { setFaceMsg(FT.needName); return }
    const dets = faceDetsRef.current
    if (!dets.length) { setFaceMsg(FT.noFace); return }
    const largest = dets.reduce((a, b) => (a.box.w * a.box.h >= b.box.w * b.box.h ? a : b))
    const next = [...registered, { id: Date.now().toString(), name, descriptor: largest.descriptor }]
    setRegistered(next); saveFaces(next); setRegName(''); setFaceMsg('')
  }
  const registerFromPhoto = async (file) => {
    const name = regName.trim()
    if (!name) { setFaceMsg(FT.needName); return }
    const fa = faceApiRef.current
    if (!fa || !file) return
    setBusyReg(true); setFaceMsg('')
    try {
      const img = await loadImage(file)
      const r = await fa.detectSingleFace(img, new fa.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()
      if (!r) { setFaceMsg(FT.noFace); return }
      const next = [...registered, { id: Date.now().toString(), name, descriptor: Array.from(r.descriptor) }]
      setRegistered(next); saveFaces(next); setRegName('')
    } catch (e) { setFaceMsg(e?.message || String(e)) }
    finally { setBusyReg(false); if (fileRef.current) fileRef.current.value = '' }
  }
  const deleteFace = (id) => { const next = registered.filter((f) => f.id !== id); setRegistered(next); saveFaces(next) }

  // 사물 감지 결과 요약(클래스별 개수) - 2026-08-02
  const summary = Object.entries(
    preds.reduce((acc, p) => { acc[p.class] = (acc[p.class] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])


  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-auto">
      {/* ── 좌: 실시간 영상 + 분석 ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-primary font-semibold flex items-center gap-1.5">
            <Camera size={17} className="text-accent" /> {t('vm.title')}
          </h2>
          <span className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-theme"
            style={{ color: pubOnline ? '#34d399' : '#9ca3af' }}>
            {pubOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {pubOnline ? t('vm.phoneConnected') : t('vm.camWait')}
          </span>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-theme text-muted">
            <Cpu size={12} />
            {mode === 'pose'
              ? (poseState === 'ready' ? FT.poseReady : poseState === 'error' ? FT.poseError : FT.poseLoading)
              : (modelState === 'ready' ? t('vm.aiReady') : modelState === 'error' ? t('vm.aiError') : t('vm.aiLoading'))}
          </span>
          {hasFrame && <span className="text-xs text-muted">{fps} fps</span>}
        </div>

        <div className="relative flex-1 min-h-64 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-theme">
          <canvas ref={viewRef} className="max-w-full max-h-full object-contain" />
          <canvas ref={rawRef} className="hidden" />

          {!hasFrame && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 px-6 text-center">
              {modelState === 'error' ? (
                <>
                  <AlertTriangle size={26} className="text-amber-400" />
                  <span className="text-sm">{t('vm.modelFail')}</span>
                  {modelErr && (
                    <span className="text-xs text-white/60 max-w-xs wrap-break-word">{t('vm.reason')}: {modelErr}</span>
                  )}
                </>
              ) : approval === 'pending' ? (
                <>
                  <Camera size={28} className="text-white/80" />
                  <span className="text-sm">{t('vm.connectReq')}</span>
                  <span className="text-xs text-white/60">{t('vm.showThis')}</span>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setApproval('allowed')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer">
                      <Check size={15} /> {t('vm.allow')}
                    </button>
                    <button onClick={() => { setApproval('blocked'); resetStream() }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-black/50 text-white border border-white/25 hover:bg-black/70 transition-colors cursor-pointer">
                      <Ban size={15} /> {t('vm.block')}
                    </button>
                  </div>
                </>
              ) : approval === 'blocked' ? (
                <>
                  <Ban size={26} className="text-white/60" />
                  <span className="text-sm">{t('vm.blocked')}</span>
                  <button onClick={() => setApproval('allowed')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer">
                    <Check size={15} /> {t('vm.changeAllow')}
                  </button>
                </>
              ) : (
                <>
                  <Camera size={28} className="text-white/70" />
                  <span className="text-sm">{t('vm.waiting')}</span>
                  <span className="text-xs text-white/60">{t('vm.scanHint')}</span>
                  {modelState !== 'ready' && (
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> {t('vm.modelLoading')}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {hasFrame && (
            <>
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                style={{ background: 'rgba(239,68,68,0.85)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
              <button onClick={() => { setApproval('blocked'); resetStream() }}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/60 text-white border border-white/25 hover:bg-black/80 transition-colors cursor-pointer flex items-center gap-1">
                <Ban size={12} /> {t('vm.block')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 우: 모드 전환 + 자동줌 + QR + 결과 ── */}
      <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        {/* 자세·행동(YOLOv8-pose) 토글은 숨김 — poseOn 고정 false로 로직·오버레이·카드 비활성. 코드/모델은 보존(추후 재활성) - 2026-09-01 */}

        {/* 사람 자동 줌인 토글 - 2026-08-31 */}
        <button
          onClick={() => setAutoZoom((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
            autoZoom ? 'bg-accent-subtle text-accent border-accent' : 'text-secondary border-theme hover-bg-elevated'
          }`}
        >
          <ZoomIn size={14} />
          {FT.autoZoom}
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${autoZoom ? 'bg-accent text-white' : 'bg-elevated text-muted'}`}>
            {autoZoom ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* 폰 연결 QR — 컴팩트 - 2026-09-01 */}
        <div className="bg-surface border border-theme rounded-2xl p-3 flex items-center gap-3">
          {qrData ? (
            <img src={qrData} alt={t('vm.qrAlt')} width={72} height={72}
              className="rounded-lg border border-theme bg-white p-1 shrink-0" />
          ) : (
            <div className="w-18 h-18 rounded-lg border border-theme bg-elevated shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-primary">{t('vm.phoneConn')}</h3>
            <p className="text-[11px] text-muted mt-0.5">{t('vm.scanHint')}</p>
          </div>
        </div>

        {mode === 'face' ? (
          /* 얼굴 인식 UI (숨김 — 버튼 없음, 코드 보존) */
          <>
            <div className="bg-surface border border-theme rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-1.5">
                <UserPlus size={14} className="text-accent" /> {FT.register}
              </h3>
              {faceState !== 'ready' ? (
                faceState === 'error' ? (
                  <div className="flex flex-col gap-2 py-1">
                    <p className="text-xs text-amber-500 flex items-center gap-1.5"><AlertTriangle size={13} /> {FT.faceError}</p>
                    {faceErr && <p className="text-[11px] text-muted wrap-break-word">{faceErr}</p>}
                    <button onClick={() => { setFaceErr(''); setFaceState('idle') }}
                      className="self-start px-3 py-1.5 rounded-lg text-xs font-medium border border-theme text-secondary hover-text-primary hover-bg-elevated transition-colors cursor-pointer">
                      {lang === 'ko' ? '재시도' : 'Retry'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted flex items-center gap-1.5 py-2"><Loader2 size={13} className="animate-spin" /> {FT.faceLoading}…</p>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder={FT.namePh}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-base border border-theme text-primary outline-none focus:border-(--accent)" />
                  <div className="flex gap-2">
                    <button onClick={registerFromLive}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer">
                      <Camera size={14} /> {FT.capture}
                    </button>
                    <button onClick={() => fileRef.current?.click()} disabled={busyReg}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium border border-theme text-secondary hover-text-primary hover-bg-elevated transition-colors cursor-pointer disabled:opacity-50">
                      {busyReg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {FT.upload}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => registerFromPhoto(e.target.files?.[0])} />
                  {faceMsg && <p className="text-xs text-amber-500">{faceMsg}</p>}
                  <p className="text-[11px] text-muted leading-relaxed">{FT.hint}</p>
                </div>
              )}
            </div>
            <div className="bg-surface border border-theme rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-1.5">
                <ScanFace size={14} className="text-accent" /> {FT.registered}
                <span className="ml-auto text-xs font-normal text-muted">{registered.length}{FT.enrolled}</span>
              </h3>
              {registered.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">{FT.none}</p>
              ) : (
                <div className="flex flex-col gap-1.5 overflow-y-auto">
                  {registered.map((f) => {
                    const live = faceDets.find((d) => d.known && d.label === f.name)
                    return (
                      <div key={f.id} className="flex items-center justify-between rounded-lg border border-theme bg-base px-3 py-2">
                        <span className="flex items-center gap-2 text-sm text-primary truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: live ? KNOWN_COLOR : '#6b7280' }} />
                          <span className="truncate">{f.name}</span>
                        </span>
                        <button onClick={() => deleteFace(f.id)} title={FT.delete}
                          className="shrink-0 p-1 rounded text-muted hover-text-danger transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
          {/* 카운팅 · 라인 통과 - 2026-08-31 */}
          <div className="bg-surface border border-theme rounded-2xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Boxes size={14} className="text-accent" /> {FT.count}
              <span className="ml-auto text-sm font-bold text-accent tnum">{preds.length}</span>
            </h3>
            <button
              onClick={() => setLineOn((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                lineOn ? 'bg-accent-subtle text-accent border-accent' : 'text-secondary border-theme hover-bg-elevated'
              }`}
            >
              <SeparatorVertical size={14} /> {FT.lineCount}
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${lineOn ? 'bg-accent text-white' : 'bg-elevated text-muted'}`}>
                {lineOn ? 'ON' : 'OFF'}
              </span>
            </button>
            {lineOn && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-theme bg-base px-2 py-2 text-center">
                    <div className="text-[11px] text-muted">{FT.toRight}</div>
                    <div className="text-lg font-bold text-primary tnum">{counts.ltr}</div>
                  </div>
                  <div className="rounded-lg border border-theme bg-base px-2 py-2 text-center">
                    <div className="text-[11px] text-muted">{FT.toLeft}</div>
                    <div className="text-lg font-bold text-primary tnum">{counts.rtl}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{FT.trackingN}: {counts.tracks}</span>
                  <button onClick={() => { trackerRef.current?.reset(); setCounts({ ltr: 0, rtl: 0, tracks: 0 }) }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer">
                    <RotateCcw size={11} /> {FT.reset}
                  </button>
                </div>
              </>
            )}
            <p className="text-[11px] text-muted leading-relaxed">{FT.customNote}</p>
          </div>

          {/* 자세·행동(토글 시) - 2026-09-01 */}
          {poseOn && (
            <div className="bg-surface border border-theme rounded-2xl p-4 flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <PersonStanding size={14} className="text-accent" /> {FT.modePose}
                {poseState === 'loading' && <Loader2 size={12} className="animate-spin text-muted ml-auto" />}
              </h3>
              {poseState === 'error' ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-amber-500 flex items-center gap-1.5"><AlertTriangle size={13} /> {FT.poseError}</p>
                  {poseErr && <p className="text-[11px] text-muted wrap-break-word">{poseErr}</p>}
                  <button onClick={() => { setPoseErr(''); setPoseState('idle') }}
                    className="self-start mt-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-theme text-secondary hover-text-primary hover-bg-elevated cursor-pointer">
                    {lang === 'ko' ? '재시도' : 'Retry'}
                  </button>
                </div>
              ) : poseState !== 'ready' ? (
                <p className="text-xs text-muted flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> {FT.poseLoading}…</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-theme bg-base px-2 py-2 text-center">
                    <div className="text-[11px] text-muted">{FT.action}</div>
                    <div className="text-sm font-bold text-primary">{poseInfo.count ? actionLabel(poseInfo.action) : FT.noPerson}</div>
                  </div>
                  <div className="rounded-lg border border-theme bg-base px-2 py-2 text-center">
                    <div className="text-[11px] text-muted">{FT.persons}</div>
                    <div className="text-lg font-bold text-primary tnum">{poseInfo.count}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 사물 감지 결과 */}
          <div className="bg-surface border border-theme rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-1.5">
              <Cpu size={14} className="text-accent" /> {t('vm.recognized')}
              <span className="ml-auto text-xs font-normal text-muted">{t('vm.count').replace('{n}', preds.length)}</span>
            </h3>
            {summary.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">
                {hasFrame ? t('vm.noObj') : t('vm.waitFrame')}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                {summary.map(([cls, cnt]) => (
                  <div key={cls} className="flex items-center justify-between rounded-lg border border-theme bg-base px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-primary">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorFor(cls) }} />
                      {cls}
                    </span>
                    <span className="text-xs font-semibold text-muted">×{cnt}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted mt-3 pt-3 border-t border-theme leading-relaxed">
              {t('vm.footer')}
            </p>
          </div>
          </>
        )}
      </aside>
    </div>
  )
}
