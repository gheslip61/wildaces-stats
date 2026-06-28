import { useEffect, useState, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { getPlayers, getAtBats, type Player, type AtBat } from '../api'
import StatTable from '../components/StatTable'

const ch = createColumnHelper<AtBat>()

const columns = [
  ch.accessor('game_date', { header: 'Date' }),
  ch.accessor('opponent', { header: 'Opponent' }),
  ch.accessor('result', { header: 'Result' }),
  ch.accessor('rbi', { header: 'RBI' }),
  ch.accessor('created_at', {
    header: 'Logged At',
    cell: (i) => {
      const v = i.getValue()
      if (!v) return '—'
      return new Date(v).toLocaleString()
    },
  }),
]

export default function AtBatHistory() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [atBats, setAtBats] = useState<AtBat[]>([])
  const [opponentFilter, setOpponentFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<string>('all')

  useEffect(() => {
    getPlayers().then((data) => {
      setPlayers(data)
      if (data.length > 0) setSelectedId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (selectedId === null) return
    getAtBats(selectedId).then(setAtBats)
  }, [selectedId])

  const opponents = useMemo(
    () => ['all', ...Array.from(new Set(atBats.map((a) => a.opponent)))],
    [atBats],
  )
  const results = useMemo(
    () => ['all', ...Array.from(new Set(atBats.map((a) => a.result)))],
    [atBats],
  )

  const filtered = useMemo(() => {
    return atBats.filter(
      (a) =>
        (opponentFilter === 'all' || a.opponent === opponentFilter) &&
        (resultFilter === 'all' || a.result === resultFilter),
    )
  }, [atBats, opponentFilter, resultFilter])

  const totalAB = atBats.filter((a) => a.result !== 'Walk').length
  const totalH = atBats.filter((a) =>
    ['Single', 'Double', 'Triple', 'Home Run'].includes(a.result),
  ).length
  const totalRBI = atBats.reduce((s, a) => s + (a.rbi || 0), 0)

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">At-Bat History</h1>

      {/* Player selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
          value={selectedId ?? ''}
          onChange={(e) => {
            setSelectedId(Number(e.target.value))
            setOpponentFilter('all')
            setResultFilter('all')
          }}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        {[
          { label: 'At-Bats', value: totalAB },
          { label: 'Hits', value: totalH },
          { label: 'RBI', value: totalRBI },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-3xl font-extrabold text-[#7b2d8b] mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5 flex gap-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
            value={opponentFilter}
            onChange={(e) => setOpponentFilter(e.target.value)}
          >
            {opponents.map((o) => (
              <option key={o} value={o}>
                {o === 'all' ? 'All Opponents' : o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
          >
            {results.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All Results' : r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <StatTable columns={columns} data={filtered} />
      </div>
    </div>
  )
}
