// 자유 그리드 대시보드 렌더러 — react-grid-layout(v2)로 드래그 이동 + 가로×세로 리사이즈 - 2026-07-25
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { GripVertical, EyeOff, SlidersHorizontal, Check } from 'lucide-react'

const accentTint = (pct) => `color-mix(in srgb, var(--accent) ${pct}%, transparent)`

const GRID = { cols: 12, rowHeight: 30, margin: [12, 12] }

// 편집 진입/종료 버튼 - 2026-07-25
function Toolbar({ editMode, setEditMode }) {
  return (
    <div className="flex justify-end">
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
    </div>
  )
}

// '위젯 추가' 팔레트 — 클릭해 배치, 우측 정렬 - 2026-07-25
function Palette({ hiddenWidgets, addWidget, iconOf }) {
  if (hiddenWidgets.length === 0) return null
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {hiddenWidgets.map((w) => {
        const Icon = iconOf(w.id)
        return (
          <button key={w.id} onClick={() => addWidget(w.id)}
            title="클릭해 대시보드에 추가"
            className="flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-xl border border-theme bg-base transition-all hover:-translate-y-0.5 hover:shadow-sm hover:border-(--accent)">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: accentTint(12), color: 'var(--accent)' }}>
              {Icon && <Icon size={16} strokeWidth={2.2} />}
            </span>
            <span className="text-xs font-semibold text-primary">{w.label}</span>
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

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      {canEdit && (
        <div className="flex flex-col gap-3 mb-3">
          <Toolbar editMode={editMode} setEditMode={setEditMode} />
          {editMode && <Palette hiddenWidgets={hiddenWidgets} addWidget={addWidget} iconOf={iconOf} />}
        </div>
      )}

      <div ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            layout={gridLayout}
            width={width}
            gridConfig={{ cols: GRID.cols, rowHeight: GRID.rowHeight, margin: GRID.margin }}
            dragConfig={{ enabled: editMode, handle: '.rgl-drag' }}
            resizeConfig={{ enabled: editMode, handles: ['se', 'e', 's'] }}
            onLayoutChange={onLayoutChange}
          >
            {gridLayout.map((item) => {
              const Icon = iconOf(item.i)
              return (
                <div key={item.i} className={editMode
                  ? 'h-full flex flex-col rounded-2xl overflow-hidden border border-theme bg-surface'
                  : 'h-full flex flex-col overflow-hidden'}>
                  {editMode && (
                    <div className="rgl-drag flex items-center justify-between px-2 py-1.5 border-b border-theme cursor-grab active:cursor-grabbing select-none shrink-0">
                      <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <GripVertical size={15} className="text-muted" />
                        {Icon && (
                          <span className="flex items-center justify-center w-6 h-6 rounded-lg"
                            style={{ background: accentTint(12), color: 'var(--accent)' }}>
                            <Icon size={13} strokeWidth={2.2} />
                          </span>
                        )}
                        {labelOf(item.i)}
                      </span>
                      <button onClick={() => removeWidget(item.i)}
                        title="숨기기"
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-muted bg-base border border-theme hover:text-red-400 hover:border-red-400/40 transition-colors">
                        <EyeOff size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-h-0 overflow-auto *:h-full">
                    {content[item.i]}
                  </div>
                </div>
              )
            })}
          </ReactGridLayout>
        )}
      </div>

      {canEdit && editMode && gridLayout.length === 0 && (
        <p className="text-xs text-muted text-center py-10">
          표시할 위젯이 없습니다. 위의 “위젯 추가”에서 배치하세요.
        </p>
      )}
    </div>
  )
}
