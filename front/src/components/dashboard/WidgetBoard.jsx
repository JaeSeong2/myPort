// 자유 그리드 대시보드 렌더러 — react-grid-layout(v2)로 드래그 이동 + 가로×세로 리사이즈 - 2026-07-25
import { useState } from 'react'
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { GripVertical, EyeOff, SlidersHorizontal, Check } from 'lucide-react'

const accentTint = (pct) => `color-mix(in srgb, var(--accent) ${pct}%, transparent)`

const GRID = { cols: 12, rowHeight: 30, margin: [12, 12], containerPadding: [12, 4] }

// 편집 진입/종료 버튼 - 2026-07-25
// 편집 토글 버튼(아이콘) — 오른쪽 사이드바에 배치 - 2026-07-25
function EditToggle({ editMode, setEditMode }) {
  return (
    <button
      onClick={() => setEditMode((v) => !v)}
      title={editMode ? '편집 완료' : '위젯 편집'}
      aria-label={editMode ? '편집 완료' : '위젯 편집'}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
      style={editMode
        ? { background: 'color-mix(in srgb, #34d399 15%, transparent)', color: '#34d399', border: '1px solid color-mix(in srgb, #34d399 35%, transparent)' }
        : { background: accentTint(10), color: 'var(--accent)', border: `1px solid ${accentTint(28)}` }}
    >
      {editMode
        ? <Check size={16} strokeWidth={2.5} />
        : <SlidersHorizontal size={16} strokeWidth={2.5} />}
    </button>
  )
}

// '위젯 추가' 팔레트 — 아이콘 전용, 오른쪽 사이드바에 세로 정렬 - 2026-07-25
// 클릭하면 맨 아래에 추가, 드래그하면 그리드의 원하는 위치에 드롭해 배치 - 2026-07-25
function Palette({ hiddenWidgets, addWidget, iconOf, onDragWidgetStart, onDragWidgetEnd }) {
  if (hiddenWidgets.length === 0) return null
  return (
    <div className="flex flex-col items-center gap-2 w-full pt-3 mt-1 border-t border-theme">
      {hiddenWidgets.map((w) => {
        const Icon = iconOf(w.id)
        return (
          <button key={w.id} onClick={() => addWidget(w.id)}
            draggable
            onDragStart={(e) => {
              // Firefox 등에서 HTML5 드래그가 시작되려면 dataTransfer 필요 - 2026-07-25
              try { e.dataTransfer.setData('text/plain', w.id); e.dataTransfer.effectAllowed = 'copy' } catch { /* noop */ }
              onDragWidgetStart(w)
            }}
            onDragEnd={onDragWidgetEnd}
            title={`${w.label} (클릭: 추가 · 드래그: 위치 지정)`} aria-label={w.label}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-theme bg-base transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-sm hover:border-(--accent)"
            style={{ color: 'var(--accent)' }}>
            {Icon && <Icon size={16} strokeWidth={2.2} />}
          </button>
        )
      })}
    </div>
  )
}

export default function WidgetBoard({ grid, content }) {
  const {
    canEdit, editMode, setEditMode,
    gridLayout, hiddenWidgets, addWidget, removeWidget, onLayoutChange, labelOf, iconOf,
  } = grid
  const { width, containerRef, mounted } = useContainerWidth()

  // 팔레트에서 드래그 중인 위젯 메타 — 드롭 시 위치 지정 배치에 사용 - 2026-07-25
  const [dragWidget, setDragWidget] = useState(null)

  // 커서 좌표 → 그리드 (x, y) 셀 좌표 환산 (RGL 배치 공식과 동일) - 2026-07-25
  const cursorToCell = (clientX, clientY, w, h) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !width) return { x: 0, y: 0 }
    const [padX, padY] = GRID.containerPadding
    const [marX, marY] = GRID.margin
    const colWidth = (width - marX * (GRID.cols - 1) - padX * 2) / GRID.cols
    const itemPxW = colWidth * w + marX * (w - 1)
    const itemPxH = GRID.rowHeight * h + marY * (h - 1)
    // 커서를 위젯 중앙에 맞춰 배치
    const relX = clientX - rect.left - itemPxW / 2
    const relY = clientY - rect.top - itemPxH / 2
    let x = Math.round((relX - padX) / (colWidth + marX))
    let y = Math.round((relY - padY) / (GRID.rowHeight + marY))
    x = Math.max(0, Math.min(x, GRID.cols - w))
    y = Math.max(0, y)
    return { x, y }
  }

  // 보드 위로 팔레트 위젯 드래그 중 — 드롭을 허용하려면 기본동작 차단 필요 - 2026-07-25
  const handleBoardDragOver = (e) => {
    if (!dragWidget) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // 팔레트 위젯을 보드에 드롭 → 커서 위치의 셀 좌표에 추가 (RGL native 드롭 미사용) - 2026-07-25
  const handleBoardDrop = (e) => {
    if (!dragWidget) return
    e.preventDefault()
    const w = dragWidget.w ?? 3
    const h = dragWidget.h ?? 4
    const { x, y } = cursorToCell(e.clientX, e.clientY, w, h)
    addWidget(dragWidget.id, { x, y })
    setDragWidget(null)
  }

  return (
    <div className="h-full flex">
      {/* 메인 보드 영역 — 상단 여백 축소 · 팔레트 위젯 드롭 대상 */}
      <div
        className="flex-1 min-w-0 overflow-y-auto pl-4 pr-2 md:pl-6 md:pr-2 pt-2 pb-4 md:pb-6"
        onDragOver={handleBoardDragOver}
        onDrop={handleBoardDrop}
      >
        <div ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            layout={gridLayout}
            width={width}
            gridConfig={{ cols: GRID.cols, rowHeight: GRID.rowHeight, margin: GRID.margin, containerPadding: GRID.containerPadding }}
            // 위젯 본문 어디서나 드래그로 이동 — 입력/버튼/링크 등 컨트롤은 예외(클릭 유지) - 2026-07-25
            dragConfig={{ enabled: editMode, cancel: '.rgl-no-drag, input, textarea, select, button, a, [role="button"]' }}
            resizeConfig={{ enabled: editMode, handles: ['se', 'e', 's'] }}
            onLayoutChange={onLayoutChange}
          >
            {gridLayout.map((item) => (
              <div key={item.i}
                className={editMode
                  ? 'relative h-full flex flex-col rounded-2xl overflow-hidden cursor-move'
                  : 'h-full flex flex-col overflow-hidden'}
                // outline은 박스 크기에 영향 없음 → 편집/보기 콘텐츠 높이 동일(스크롤 차이 없음) - 2026-07-25
                style={editMode ? {
                  outline: '1px solid color-mix(in srgb, var(--text-muted) 12%, transparent)',
                  outlineOffset: '-1px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                } : undefined}>
                <div className="flex-1 min-h-0 overflow-auto *:h-full">
                  {content[item.i]}
                </div>

                {/* 오버레이 컨트롤 — 헤더 대신 우상단에 떠 있음(공간 차지 X) - 2026-07-25 */}
                {editMode && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    {/* 드래그 힌트 — 위젯 본문 전체가 드래그 가능(div라 cancel 예외에 걸리지 않음) - 2026-07-25 */}
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-lg cursor-grab active:cursor-grabbing bg-surface border border-theme text-muted shadow-sm select-none pointer-events-none"
                      title={`${labelOf(item.i)} 이동`}
                      aria-hidden="true">
                      <GripVertical size={14} />
                    </span>
                    <button onClick={() => removeWidget(item.i)}
                      title="숨기기" aria-label={`${labelOf(item.i)} 숨기기`}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface border border-theme text-muted hover:text-red-400 hover:border-red-400/40 shadow-sm transition-colors">
                      <EyeOff size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>

        {canEdit && editMode && gridLayout.length === 0 && (
          <p className="text-xs text-muted text-center py-10">
            표시할 위젯이 없습니다. 오른쪽 사이드바의 “위젯 추가”에서 배치하세요.
          </p>
        )}
      </div>

      {/* 오른쪽 사이드바 — 위젯 편집 버튼 + (편집 시) 위젯 추가 아이콘 세로 정렬 - 2026-07-25 */}
      {canEdit && (
        <aside className="w-14 shrink-0 border-l border-theme bg-base flex flex-col items-center pt-2 gap-3 overflow-y-auto">
          <EditToggle editMode={editMode} setEditMode={setEditMode} />
          {editMode && (
            <Palette
              hiddenWidgets={hiddenWidgets}
              addWidget={addWidget}
              iconOf={iconOf}
              onDragWidgetStart={setDragWidget}
              onDragWidgetEnd={() => setDragWidget(null)}
            />
          )}
        </aside>
      )}
    </div>
  )
}
