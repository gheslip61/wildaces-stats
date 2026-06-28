import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/player-stats', label: 'Player Stats', icon: '👤' },
  { to: '/team-stats', label: 'Team Stats', icon: '📊' },
  { to: '/stat-leaders', label: 'Stat Leaders', icon: '🏆' },
  { to: '/at-bat-history', label: 'At-Bat History', icon: '📋' },
  { to: '/optimal-lineup', label: 'Optimal Lineup', icon: '⚾' },
  { to: '/data-entry', label: 'Data Entry', icon: '✏️' },
  { to: '/scoresheet-import', label: 'Scoresheet Import', icon: '📷' },
  { to: '/game-stars', label: '3 Stars', icon: '⭐' },
  { to: '/game-scores', label: 'Game Scores', icon: '🏟️' },
]

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-[#0d1b2a] flex flex-col z-50">
      {/* Logo + title */}
      <div className="flex flex-col items-center py-6 border-b border-white/10">
        <img
          src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/photos/logo.png`}
          alt="Wild Aces Logo"
          className="w-20 h-20 object-contain rounded-lg mb-3"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <span className="text-white font-bold text-base text-center leading-tight px-2">
          Wild Aces Stats
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#7b2d8b] text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="py-3 px-4 border-t border-white/10">
        <p className="text-gray-500 text-xs text-center">Wild Aces Baseball</p>
      </div>
    </aside>
  )
}
