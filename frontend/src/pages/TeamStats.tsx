import { useEffect, useState, useMemo, useRef } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  getTeamStats,
  getTeamStatsForGame,
  getGames,
  type TeamStatsRow,
  type Game,
} from '../api'
import StatTable from '../components/StatTable'

const ch = createColumnHelper<TeamStatsRow>()

const ALL_STAT_COLS = [
  'name', 'ab', 'hits', 'singles', 'doubles', 'triples',
  'home_runs', 'walks', 'strikeouts', 'rbi', 'ba', 'obp', 'slg', 'ops',
] as const

type StatKey = typeof ALL_STAT_COLS[number]

const STAT_LABELS: Record<StatKey, string> = {
  name: 'Player', ab: 'AB', hits: 'H', singles: '1B', doubles: '2B',
  triples: '3B', home_runs: 'HR', walks: 'BB', strikeouts: 'K',
  rbi: 'RBI', ba: 'BA', obp: 'OBP', slg: 'SLG', ops: 'OPS',
}

const RATE_STATS: StatKey[] = ['ba', 'obp', 'slg', 'ops']

const STAT_DEFINITIONS = [
  { stat: 'AB', def: 'At-Bats — plate appearances excluding walks.' },
  { stat: 'H', def: 'Hits — singles, doubles, triples, and home runs.' },
  { stat: 'BA', def: 'Batting Average — H / AB.' },
  { stat: 'OBP', def: 'On-Base Percentage — (H + BB) / (AB + BB).' },
  { stat: 'SLG', def: 'Slugging Percentage — total bases / AB.' },
  { stat: 'OPS', def: 'On-base Plus Slugging — OBP + SLG.' },
]

/** Compact dropdown with a checkbox list, closes on outside click. */
function CheckDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    )
  }

  const allSelected = selected.length === options.length

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-[#7b2d8b] flex items-center gap-2"
      >
        {label}
        <span className="text-xs text-gray-400">
          {allSelected ? 'All' : `${selected.length}/${options.length}`}
        </span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-48 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          <button
            type="button"
            className="text-xs text-[#7b2d8b] font-semibold mb-1 hover:underline"
            onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 px-1 py-1 text-sm text-gray-700 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                className="accent-[#7b2d8b]"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamStats() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<string>('all')
  const [data, setData] = useState<TeamStatsRow[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedStats, setSelectedStats] = useState<StatKey[]>(
    ALL_STAT_COLS.filter((s) => s !== 'name'),
  )
  const [minAB, setMinAB] = useState<number>(0)

  useEffect(() => {
    getGames().then(setGames)
    getTeamStats().then((rows) => {
      setData(rows)
      setSelectedPlayers(rows.map((r) => r.name))
    })
  }, [])

  useEffect(() => {
    if (selectedGame === 'all') {
      getTeamStats().then(setData)
    } else {
      const [date, ...rest] = selectedGame.split('|')
      getTeamStatsForGame(date, rest.join('|')).then(setData)
    }
  }, [selectedGame])

  const filteredData = useMemo(() => {
    return data.filter(
      (row) =>
        (selectedPlayers.length === 0 || selectedPlayers.includes(row.name)) &&
        row.ab >= minAB,
    )
  }, [data, selectedPlayers, minAB])

  const activeColumns = useMemo(() => {
    const cols: StatKey[] = ['name', ...selectedStats.filter((s) => s !== 'name')]
    return cols.map((key) =>
      ch.accessor(key as keyof TeamStatsRow, {
        id: key,
        header: STAT_LABELS[key],
        cell: (info) => {
          const v = info.getValue()
          if (RATE_STATS.includes(key)) return (v as number).toFixed(3)
          return v
        },
      }),
    )
  }, [selectedStats])

  const allPlayerNames = data.map((r) => r.name)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Team Stats</h1>

      {/* Compact filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
        >
          <option value="all">Full Season</option>
          {games.map((g) => (
            <option key={`${g.game_date}|${g.opponent}`} value={`${g.game_date}|${g.opponent}`}>
              {g.game_date} vs {g.opponent}
            </option>
          ))}
        </select>

        <CheckDropdown
          label="Players"
          options={allPlayerNames.map((n) => ({ value: n, label: n }))}
          selected={selectedPlayers}
          onChange={setSelectedPlayers}
        />

        <CheckDropdown
          label="Stats"
          options={ALL_STAT_COLS.filter((s) => s !== 'name').map((s) => ({
            value: s,
            label: STAT_LABELS[s],
          }))}
          selected={selectedStats}
          onChange={(next) => setSelectedStats(next as StatKey[])}
        />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          Min AB
          <input
            type="number"
            min={0}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
            value={minAB}
            onChange={(e) => setMinAB(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <StatTable columns={activeColumns} data={filteredData} />
        <p className="mt-3 text-xs text-gray-400">Click column headers to sort the table.</p>
      </div>

      {/* Stat definitions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Stat Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {STAT_DEFINITIONS.map((d) => (
            <div key={d.stat} className="flex gap-2 text-sm">
              <span className="font-bold text-[#7b2d8b] w-10 shrink-0">{d.stat}</span>
              <span className="text-gray-600">{d.def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
