import { useNavigate } from 'react-router-dom'

/**
 * 로그인 진입 페이지
 * Enter System 버튼 클릭 시 메인 페이지(/main)로 전환
 * @date 2026-05-23
 */
export default function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center">
      <div className="bg-surface border border-theme rounded-2xl p-10 w-full max-w-sm shadow-2xl">

        <button
          onClick={() => navigate('/main')}
          className="w-full bg-accent hover:opacity-90 active:opacity-80 text-white font-semibold py-3 px-6 rounded-xl transition-opacity duration-150 cursor-pointer"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Enter System
        </button>

      </div>
    </div>
  )
}
