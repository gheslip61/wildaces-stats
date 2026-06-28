import { useEffect, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  getPlayers,
  getPlayerStats,
  getGameStats,
  type Player,
  type StatsRow,
  type GameStatsRow,
} from '../api'
import StatTable from '../components/StatTable'
import PlayerPhoto from '../components/PlayerPhoto'

const sh = createColumnHelper<StatsRow>()
const gh = createColumnHelper<GameStatsRow>()

const seasonColumns = [
  sh.accessor('ab', { header: 'AB' }),
  sh.accessor('hits', { header: 'H' }),
  sh.accessor('singles', { header: '1B' }),
  sh.accessor('doubles', { header: '2B' }),
  sh.accessor('triples', { header: '3B' }),
  sh.accessor('home_runs', { header: 'HR' }),
  sh.accessor('walks', { header: 'BB' }),
  sh.accessor('strikeouts', { header: 'K' }),
  sh.accessor('rbi', { header: 'RBI' }),
  sh.accessor('ba', { header: 'BA', cell: (i) => i.getValue().toFixed(3) }),
  sh.accessor('obp', { header: 'OBP', cell: (i) => i.getValue().toFixed(3) }),
  sh.accessor('slg', { header: 'SLG', cell: (i) => i.getValue().toFixed(3) }),
  sh.accessor('ops', { header: 'OPS', cell: (i) => i.getValue().toFixed(3) }),
]

const gameColumns = [
  gh.accessor('game_date', { header: 'Date' }),
  gh.accessor('opponent', { header: 'Opponent' }),
  gh.accessor('ab', { header: 'AB' }),
  gh.accessor('hits', { header: 'H' }),
  gh.accessor('doubles', { header: '2B' }),
  gh.accessor('triples', { header: '3B' }),
  gh.accessor('home_runs', { header: 'HR' }),
  gh.accessor('walks', { header: 'BB' }),
  gh.accessor('strikeouts', { header: 'K' }),
  gh.accessor('rbi', { header: 'RBI' }),
  gh.accessor('ba', { header: 'BA', cell: (i) => i.getValue().toFixed(3) }),
  gh.accessor('obp', { header: 'OBP', cell: (i) => i.getValue().toFixed(3) }),
  gh.accessor('ops', { header: 'OPS', cell: (i) => i.getValue().toFixed(3) }),
]

export default function PlayerStats() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [stats, setStats] = useState<StatsRow | null>(null)
  const [gameStats, setGameStats] = useState<GameStatsRow[]>([])

  useEffect(() => {
    getPlayers().then((data) => {
      setPlayers(data)
      if (data.length > 0) setSelectedId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (selectedId === null) return
    getPlayerStats(selectedId).then(setStats)
    getGameStats(selectedId).then(setGameStats)
  }, [selectedId])

  const selected = players.find((p) => p.id === selectedId)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Player selector */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Player Stats</h1>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selected && stats && (
        <>
          {/* Header card: photo | name + details | logo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-start gap-6">
              <PlayerPhoto name={selected.name} className="w-36 h-44 shrink-0" />

              <div className="flex-1 min-w-0">
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-wide uppercase mb-2">
                  {selected.name}
                </h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-24">Team</dt>
                    <dd className="text-gray-700 font-medium">{selected.team || 'Wild Aces'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-24">Position</dt>
                    <dd className="text-gray-700 font-medium">{selected.position || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-400 w-24">Handedness</dt>
                    <dd className="text-gray-700 font-medium">{selected.handedness || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-6">
                  {(
                    [
                      ['BA', stats.ba, '#7b2d8b'],
                      ['OBP', stats.obp, '#7b2d8b'],
                      ['SLG', stats.slg, '#7b2d8b'],
                      ['OPS', stats.ops, '#e91e8c'],
                    ] as const
                  ).map(([label, value, color]) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-gray-400 font-medium">{label}</p>
                      <p className="font-extrabold text-2xl" style={{ color }}>
                        {value.toFixed(3)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <img
                src="http://localhost:8000/photos/logo.png"
                alt="Wild Aces Logo"
                className="w-24 h-24 object-contain shrink-0 hidden sm:block"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>
          </div>

          {/* Season Stats — full width */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Season Stats</h3>
            <StatTable columns={seasonColumns} data={[stats]} />
          </div>

          {/* Game Log — full width */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Game Log</h3>
            <StatTable columns={gameColumns} data={gameStats} />
          </div>
        </>
      )}
    </div>
  )
}
