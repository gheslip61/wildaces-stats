import { useEffect, useState } from 'react'
import { getTeamStats, type TeamStatsRow } from '../api'
import PlayerPhoto from '../components/PlayerPhoto'

interface LeaderCardProps {
  stat: string
  label: string
  leader: TeamStatsRow | null
  value: string
}

function LeaderCard({ stat, label, leader, value }: LeaderCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#7b2d8b] px-5 py-3">
        <h3 className="text-white font-bold text-lg">{stat} — {label}</h3>
      </div>
      {leader ? (
        <div className="p-4 flex items-center gap-4">
          <PlayerPhoto name={leader.name} className="w-20 h-24 shrink-0" />
          <div>
            <p className="font-bold text-gray-800 text-lg">{leader.name}</p>
            <p className="text-[#7b2d8b] font-extrabold text-3xl mt-1">{value}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-gray-400 italic text-sm">No data</div>
      )}
    </div>
  )
}

export default function StatLeaders() {
  const [stats, setStats] = useState<TeamStatsRow[]>([])

  useEffect(() => {
    getTeamStats().then(setStats)
  }, [])

  const pool = stats.filter((s) => s.ab > 0)

  function leader(key: keyof TeamStatsRow) {
    if (pool.length === 0) return null
    return pool.reduce((a, b) => ((a[key] as number) >= (b[key] as number) ? a : b))
  }

  const cards: { stat: string; label: string; key: keyof TeamStatsRow; fmt: (v: number) => string }[] = [
    { stat: 'OPS', label: 'On-base Plus Slugging', key: 'ops', fmt: (v) => v.toFixed(3) },
    { stat: 'BA', label: 'Batting Average', key: 'ba', fmt: (v) => v.toFixed(3) },
    { stat: 'OBP', label: 'On-Base Percentage', key: 'obp', fmt: (v) => v.toFixed(3) },
    { stat: 'SLG', label: 'Slugging Percentage', key: 'slg', fmt: (v) => v.toFixed(3) },
    { stat: 'HR', label: 'Home Runs', key: 'home_runs', fmt: (v) => String(v) },
    { stat: 'RBI', label: 'Runs Batted In', key: 'rbi', fmt: (v) => String(v) },
    { stat: 'H', label: 'Hits', key: 'hits', fmt: (v) => String(v) },
    { stat: 'BB', label: 'Walks', key: 'walks', fmt: (v) => String(v) },
  ]

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Stat Leaders</h1>
      <div className="space-y-4">
        {cards.map((c) => {
          const l = leader(c.key)
          return (
            <LeaderCard
              key={c.stat}
              stat={c.stat}
              label={c.label}
              leader={l}
              value={l ? c.fmt(l[c.key] as number) : '—'}
            />
          )
        })}
      </div>
    </div>
  )
}
