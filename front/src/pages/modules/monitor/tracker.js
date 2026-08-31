// 경량 IoU 트래커 + 세로 라인 통과 카운트 — ByteTrack 없이 데모용 - 2026-08-31
function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const uni = a.w * a.h + b.w * b.h - inter
  return uni > 0 ? inter / uni : 0
}

export class Tracker {
  constructor(opts = {}) {
    this.iouThres = opts.iouThres ?? 0.3
    this.maxMissed = opts.maxMissed ?? 12
    this.tracks = []
    this.nextId = 1
    this.counts = { ltr: 0, rtl: 0 } // 좌→우 / 우→좌 통과 누적
  }

  reset() {
    this.tracks = []
    this.nextId = 1
    this.counts = { ltr: 0, rtl: 0 }
  }

  // dets: [{x,y,w,h,cls,score}], lineX: 세로 라인 x(원본px, null이면 카운트 안 함) - 2026-08-31
  update(dets, lineX) {
    this.tracks.forEach((tr) => { tr.matched = false })
    const used = new Set()

    for (const d of dets) {
      let best = null, bi = -1, bIoU = this.iouThres
      this.tracks.forEach((tr, idx) => {
        if (used.has(idx)) return
        const v = iou(tr, d)
        if (v > bIoU) { bIoU = v; best = tr; bi = idx }
      })
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2
      if (best) {
        used.add(bi)
        const prevCx = best.cx
        best.x = d.x; best.y = d.y; best.w = d.w; best.h = d.h; best.cls = d.cls
        best.cx = cx; best.cy = cy; best.missed = 0; best.matched = true
        if (lineX != null) {
          if (prevCx < lineX && cx >= lineX) this.counts.ltr++
          else if (prevCx > lineX && cx <= lineX) this.counts.rtl++
        }
      } else {
        this.tracks.push({ id: this.nextId++, x: d.x, y: d.y, w: d.w, h: d.h, cls: d.cls, cx, cy, missed: 0, matched: true })
      }
    }

    // 미매칭 트랙 노화·제거
    this.tracks = this.tracks.filter((tr) => {
      if (!tr.matched) tr.missed = (tr.missed || 0) + 1
      return (tr.missed || 0) <= this.maxMissed
    })
    return this.tracks
  }
}
