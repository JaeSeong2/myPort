// 사용자 인증 및 권한 컨텍스트 - 2026-05-23
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { API_BASE } from '../constants/api'

const API = `${API_BASE}/api/users`

const FULL_ACTIONS = { add: true, edit: true, delete: true, excel_up: true, excel_down: true }

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
        const list = json.data ?? []
        if (list.length === 0) return
        setUsers(list)
        // 최초 로드 시 첫 번째 ADMIN 사용자로 자동 설정
        setCurrentUser(prev =>
          prev._id === '__admin__'
            ? (list.find(u => u.role === 'ADMIN') ?? list[0])
            : prev
        )
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

  const switchUser = (user) => { setCurrentUser(user); setDropdownOpen(false) }

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
