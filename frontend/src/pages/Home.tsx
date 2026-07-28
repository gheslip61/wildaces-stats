import { Link, useNavigate } from 'react-router-dom'

const cards = [
  { to: '/player-stats', title: 'Player Stats', desc: 'Season totals, game logs, and rate stats for each player.' },
  { to: '/team-stats', title: 'Team Stats', desc: 'Full team stats by season or individual game.' },
  { to: '/stat-leaders', title: 'Stat Leaders', desc: 'Who leads the team in each category?' },
  { to: '/at-bat-history', title: 'At-Bat History', desc: 'Review every plate appearance by player.' },
  { to: '/optimal-lineup', title: 'Optimal Lineup', desc: 'Algorithm-generated batting order based on current stats.' },
  { to: '/data-entry', title: 'Data Entry', desc: 'Log at-bats, manage players, and update game info.' },
]

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      {/* Logo */}
      <img
        src="http://localhost:8000/photos/logo.png"
        alt="Wild Aces"
        className="w-32 h-32 object-contain mb-6 rounded-xl shadow"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />

      <h1 className="text-4xl font-extrabold text-[#7b2d8b] mb-2 text-center">
        Wild Aces Stats Center
      </h1>

      <button
        onClick={() => navigate('/all-star-voting')}
        className="mt-4 mb-10 px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold text-lg rounded-full shadow-lg hover:shadow-xl transition-all animate-pulse"
      >
        ⭐ Click Here to Vote for All-Stars! ⭐
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="bg-white rounded-xl shadow hover:shadow-md border border-gray-100 hover:border-[#7b2d8b] transition-all p-6 flex flex-col gap-2 group"
          >
            <h2 className="text-lg font-bold text-gray-800 group-hover:text-[#7b2d8b] transition-colors">
              {card.title}
            </h2>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
