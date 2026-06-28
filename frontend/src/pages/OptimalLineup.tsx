import { useEffect, useState } from 'react'
import { getAllPlayerGameStats, type PlayerGameStats } from '../api'
import PlayerPhoto from '../components/PlayerPhoto'

// ---------------------------------------------------------------------------
// Recency decay factor — each game further back is worth this fraction of
// the previous game. 0.75 means game N-1 = 75% weight of game N.
// ---------------------------------------------------------------------------
const DECAY = 0.75

const LINEUP_LABELS: Record<number, string> = {
  1: 'Leadoff', 2: '2-Hole', 3: '3-Hole', 4: 'Cleanup',
  5: '5-Hole', 6: '6-Hole', 7: '7-Hole', 8: '8-Hole', 9: '9-Hole',
}

const SPOT_COLORS: Record<number, string> = {
  1: 'bg-blue-600', 2: 'bg-blue-500', 3: 'bg-[#7b2d8b]', 4: 'bg-[#e91e8c]',
  5: 'bg-gray-600', 6: 'bg-gray-500', 7: 'bg-gray-500', 8: 'bg-gray-400', 9: 'bg-gray-400',
}

// ---------------------------------------------------------------------------
// Weighted stat computation
// ---------------------------------------------------------------------------

interface ComputedStats {
  player_id: number
  name: string
  ab: number
  hits: number
  singles: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  rbi: number
  ba: number
  obp: number
  slg: number
  ops: number
  games: number
}

function computeStats(games: PlayerGameStats[], useDecay: boolean): ComputedStats {
  // Most recent game first
  const sorted = [...games].sort((a, b) => b.game_date.localeCompare(a.game_date))

  let wAB = 0, wHits = 0, wSingles = 0, wDoubles = 0, wTriples = 0, wHRs = 0
  let wWalks = 0, wRBI = 0

  sorted.forEach((g, i) => {
    const w = useDecay ? Math.pow(DECAY, i) : 1
    wAB      += (g.ab ?? 0) * w
    wHits    += (g.hits ?? 0) * w
    wSingles += (g.singles ?? 0) * w
    wDoubles += (g.doubles ?? 0) * w
    wTriples += (g.triples ?? 0) * w
    wHRs     += (g.home_runs ?? 0) * w
    wWalks   += (g.walks ?? 0) * w
    wRBI     += (g.rbi ?? 0) * w
  })

  const ba  = wAB > 0 ? wHits / wAB : 0
  const obp = (wAB + wWalks) > 0 ? (wHits + wWalks) / (wAB + wWalks) : 0
  const tb  = wSingles + 2 * wDoubles + 3 * wTriples + 4 * wHRs
  const slg = wAB > 0 ? tb / wAB : 0

  return {
    player_id: games[0].player_id,
    name: games[0].name,
    ab: wAB,
    hits: wHits,
    singles: wSingles,
    doubles: wDoubles,
    triples: wTriples,
    home_runs: wHRs,
    walks: wWalks,
    rbi: wRBI,
    games: games.length,
    ba:  +ba.toFixed(3),
    obp: +obp.toFixed(3),
    slg: +slg.toFixed(3),
    ops: +(obp + slg).toFixed(3),
  }
}

// ---------------------------------------------------------------------------
// Lineup builder — same slot logic as before
// ---------------------------------------------------------------------------

interface LineupRow {
  spot: number
  label: string
  stats: ComputedStats
}

function buildLineup(pool: ComputedStats[]): LineupRow[] {
  const remaining = [...pool.filter((p) => p.ab > 0)]
  if (remaining.length === 0) return []

  const lineup: Record<number, ComputedStats> = {}

  function popBest(key: keyof ComputedStats): ComputedStats {
    const best = remaining.reduce((a, b) =>
      ((a[key] as number) >= (b[key] as number) ? a : b),
    )
    remaining.splice(remaining.indexOf(best), 1)
    return best
  }

  lineup[3] = popBest('ops')
  lineup[4] = popBest('slg')
  lineup[1] = popBest('obp')
  lineup[2] = popBest('obp')

  remaining.sort((a, b) => b.ops - a.ops)
  remaining.forEach((p, i) => { lineup[i + 5] = p })

  return Object.entries(lineup)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([spot, s]) => ({
      spot: Number(spot),
      label: LINEUP_LABELS[Number(spot)] ?? `${spot}-Hole`,
      stats: s,
    }))
}

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------

const LEGEND = [
  { spot: 1, label: 'Leadoff',  reason: 'Best OBP — gets on base most often.' },
  { spot: 2, label: '2-Hole',   reason: '2nd best OBP — strong contact hitter.' },
  { spot: 3, label: '3-Hole',   reason: 'Best OPS — most complete hitter.' },
  { spot: 4, label: 'Cleanup',  reason: 'Best SLG — drives in baserunners.' },
  { spot: 5, label: '5+',       reason: 'Remaining players sorted by OPS.' },
]

function SpotCard({ row, useDecay }: { row: LineupRow; useDecay: boolean }) {
  const { spot, label, stats: s } = row
  const color = SPOT_COLORS[spot] ?? 'bg-gray-400'
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
      <div className={`${color} w-16 flex flex-col items-center justify-center text-white shrink-0`}>
        <span className="text-2xl font-extrabold">{spot}</span>
        <span className="text-xs font-medium mt-1 text-center px-1 leading-tight">{label}</span>
      </div>
      <div className="flex items-center gap-4 p-4 flex-1">
        <PlayerPhoto name={s.name} className="w-16 h-20 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 text-base">{s.name}</p>
            {useDecay && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                {s.games}G weighted
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-sm flex-wrap">
            {[
              { label: 'OPS', val: s.ops.toFixed(3), highlight: true },
              { label: 'OBP', val: s.obp.toFixed(3) },
              { label: 'SLG', val: s.slg.toFixed(3) },
              { label: 'BA',  val: s.ba.toFixed(3) },
              { label: 'HR',  val: String(Math.round(s.home_runs)) },
              { label: 'RBI', val: String(Math.round(s.rbi)) },
            ].map(({ label, val, highlight }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`font-${highlight ? 'bold' : 'semibold'} ${highlight ? 'text-[#7b2d8b]' : 'text-gray-700'}`}>
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OptimalLineup() {
  const [allGameStats, setAllGameStats] = useState<PlayerGameStats[]>([])
  const [useDecay, setUseDecay] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllPlayerGameStats()
      .then(setAllGameStats)
      .finally(() => setLoading(false))
  }, [])

  // Group per-game rows by player, then compute weighted stats
  const playerGroups = new Map<number, PlayerGameStats[]>()
  for (const row of allGameStats) {
    if (!playerGroups.has(row.player_id)) playerGroups.set(row.player_id, [])
    playerGroups.get(row.player_id)!.push(row)
  }

  const computedPool = Array.from(playerGroups.values()).map((games) =>
    computeStats(games, useDecay),
  )

  const lineup = buildLineup(computedPool)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Optimal Lineup</h1>

        {/* Season / Recent Form toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
          <button
            onClick={() => setUseDecay(false)}
            className={`px-4 py-2 font-medium transition-colors ${
              !useDecay ? 'bg-[#7b2d8b] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Season Stats
          </button>
          <button
            onClick={() => setUseDecay(true)}
            className={`px-4 py-2 font-medium transition-colors border-l border-gray-300 ${
              useDecay ? 'bg-[#7b2d8b] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Recent Form
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {useDecay
          ? `Recency-weighted batting order — each game back is worth ${Math.round(DECAY * 100)}% of the previous one, so hot recent play drives the rankings.`
          : 'Algorithm-generated batting order based on full season statistics.'}
      </p>

      {loading ? (
        <p className="text-gray-400 italic text-sm">Loading…</p>
      ) : (
        <div className="space-y-3 mb-6">
          {lineup.map((row) => (
            <SpotCard key={row.spot} row={row} useDecay={useDecay} />
          ))}
          {lineup.length === 0 && (
            <p className="text-gray-400 italic text-sm">No players with at-bats found.</p>
          )}
        </div>
      )}

      {/* Collapsible legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setLegendOpen((o) => !o)}
        >
          <span>Lineup Algorithm Legend</span>
          <span>{legendOpen ? '▲' : '▼'}</span>
        </button>
        {legendOpen && (
          <div className="px-5 pb-4 space-y-2 border-t border-gray-100">
            {LEGEND.map((l) => (
              <div key={l.spot} className="flex gap-3 text-sm pt-2">
                <span className="font-bold text-[#7b2d8b] w-20 shrink-0">#{l.spot} {l.label}</span>
                <span className="text-gray-600">{l.reason}</span>
              </div>
            ))}
            <div className="flex gap-3 text-sm pt-2 border-t border-gray-100 mt-2">
              <span className="font-bold text-purple-600 w-20 shrink-0">Recent Form</span>
              <span className="text-gray-600">
                Exponential decay: most recent game = 1.0×, each prior game multiplied by {DECAY}×.
                Stats shown are weighted — HR/RBI are rounded for display.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
