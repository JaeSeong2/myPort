// 사용자 인증 및 권한 컨텍스트 - 2026-05-23
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { API_BASE } from '../constants/api'

const API = `${API_BASE}/api/users`

const FULL_ACTIONS = { add: true, edit: true, delete: true, excel_up: true, excel_down: true }

// 사용자 전환 드롭다운에 표시할 계정 목록 (관리자 + 3명)
const SWITCHER_IDS = new Set(['admin', 'emp002', 'emp003', 'emp007'])

// 마지막 선택 사용자 저장 키 — 새로고침 후에도 같은 사용자 유지(관리자 외 포함) - 2026-07-28
const CURRENT_USER_KEY = 'mes_current_user'
const loadSavedUserId = () => { try { return localStorage.getItem(CURRENT_USER_KEY) } catch { return null } }

// DB에 사용자가 없을 때 사용할 기본 관리자
const DEFAULT_ADMIN = {
  _id: '__admin__',
  user_id: 'ADMIN',
  name: '관리자',
  role: 'ADMIN',
  menus: [],
  actions: FULL_ACTIONS,
  active: true,
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [users, setUsers]               = useState([DEFAULT_ADMIN])
  const [currentUser, setCurrentUser]   = useState(DEFAULT_ADMIN)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef(null)

  const loadUsers = () =>
    fetch(`${API}?active_only=true`)
      .then(r => r.json())
      .then(json => {
        const list = (json.data ?? []).filter(u => SWITCHER_IDS.has(u.user_id))
        if (list.length === 0) return
        setUsers(list)
        // 최초 로드 시: 저장된 마지막 사용자 복원 → 없으면 첫 ADMIN - 2026-07-28
        setCurrentUser(prev => {
          if (prev._id !== '__admin__') return prev // 이미 전환된 상태면 유지
          const savedId = loadSavedUserId()
          const saved = savedId && list.find(u => u.user_id === savedId)
          return saved || list.find(u => u.role === 'ADMIN') || list[0]
        })
      })
      .catch(() => {})

  useEffect(() => { loadUsers() }, [])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const close = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // ADMIN은 항상 전체 권한, USER는 DB 저장값 사용
  const actions = currentUser.role === 'ADMIN'
    ? FULL_ACTIONS
    : (currentUser.actions ?? { add: false, edit: false, delete: false, excel_up: false, excel_down: false })

  // 메뉴 ID 접근 여부
  const hasMenu = (menuId) => {
    if (currentUser.role === 'ADMIN') return true
    const menus = currentUser.menus ?? []
    if (menus.length === 0) return true
    return menus.includes(menuId)
  }

  // 사용자 전환 — 선택을 저장해 새로고침 후에도 유지 - 2026-07-28
  const switchUser = (user) => {
    setCurrentUser(user)
    setDropdownOpen(false)
    try { localStorage.setItem(CURRENT_USER_KEY, user.user_id) } catch { /* noop */ }
  }

  return (
    <AuthContext.Provider value={{
      currentUser, users, actions, hasMenu,
      switchUser, loadUsers,
      dropdownOpen, setDropdownOpen, dropRef,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
