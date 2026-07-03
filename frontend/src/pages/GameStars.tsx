import { useEffect, useState } from 'react'
import { getGames, getGameAtBats, getGameScore, type Game, type GameAtBat, type GameScore } from '../api'
import PlayerPhoto from '../components/PlayerPhoto'

// ---------------------------------------------------------------------------
// Linear weights (run value per event, from modern baseball analytics)
// ---------------------------------------------------------------------------
const LINEAR_WEIGHTS: Record<string, number> = {
  Single: 0.89,
  Double: 1.27,
  Triple: 1.62,
  'Home Run': 2.10,
  Walk: 0.69,
}

// ---------------------------------------------------------------------------
// Leverage calculation
// All PAs in the same half-inning share the same entry-state leverage.
// This is an accepted approximation — the exact mid-PA base-out state is
// unavailable; entry state captures the game situation well enough.
// ---------------------------------------------------------------------------

function getScoreEnteringHalfInning(
  inning: number,
  isHome: boolean | null,
  waRuns: number[],
  oppRuns: number[],
): { waScore: number; oppScore: number } {
  // Wild Aces' accumulated runs through the end of inning (inning - 1)
  const waThrough = waRuns.slice(0, inning - 1).reduce((a, b) => a + b, 0)

  if (isHome) {
    // Home team bats in the BOTTOM half — opponent has already batted in the top
    const oppThrough = oppRuns.slice(0, inning).reduce((a, b) => a + b, 0)
    return { waScore: waThrough, oppScore: oppThrough }
  } else {
    // Away team bats in the TOP half — opponent has not yet batted this inning
    const oppThrough = oppRuns.slice(0, inning - 1).reduce((a, b) => a + b, 0)
    return { waScore: waThrough, oppScore: oppThrough }
  }
}

function getLeverage(inning: number, margin: number): number {
  const absMargin = Math.abs(margin)
  const closeness = absMargin <= 1 ? 1.4 : absMargin <= 3 ? 1.1 : 0.8
  // 7-inning game: late-inning multiplier starts at inning 5
  const inningMult = inning <= 4 ? 1.0 : inning <= 6 ? 1.15 : 1.3
  return closeness * inningMult
}

// ---------------------------------------------------------------------------
// Per-player star score
// ---------------------------------------------------------------------------

interface PlayerPerf {
  player_id: number
  name: string
  singles: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  rbi: number
  ab: number
  score: number
  totalBases: number
  lateScore: number // weighted score from innings 5+, used as tie-breaker
  ops: number
}

function computeStars(atBats: GameAtBat[], gameScore: GameScore | null): PlayerPerf[] {
  const byPlayer = new Map<number, { name: string; abs: GameAtBat[] }>()
  for (const ab of atBats) {
    if (!byPlayer.has(ab.player_id)) {
      byPlayer.set(ab.player_id, { name: ab.player_name, abs: [] })
    }
    byPlayer.get(ab.player_id)!.abs.push(ab)
  }

  const results: PlayerPerf[] = []

  for (const [pid, { name, abs }] of byPlayer) {
    let weightedScore = 0
    let totalRbi = 0
    let singles = 0, doubles = 0, triples = 0, hrs = 0, walks = 0, strikeouts = 0
    let lateScore = 0

    for (const ab of abs) {
      const lw = LINEAR_WEIGHTS[ab.result] ?? 0

      // Determine leverage for this at-bat
      let leverage = 1.0
      if (ab.inning !== null && gameScore) {
        const { waScore, oppScore } = getScoreEnteringHalfInning(
          ab.inning,
          gameScore.is_home,
          gameScore.wild_aces_runs,
          gameScore.opponent_runs,
        )
        leverage = getLeverage(ab.inning, waScore - oppScore)
      }

      const weighted = lw * leverage
      weightedScore += weighted
      totalRbi += ab.rbi

      if (ab.result === 'Single') singles++
      else if (ab.result === 'Double') doubles++
      else if (ab.result === 'Triple') triples++
      else if (ab.result === 'Home Run') hrs++
      else if (ab.result === 'Walk') walks++
      else strikeouts++

      // Late-inning contribution (innings 5+) for tie-breaking
      if (ab.inning !== null && ab.inning >= 5) lateScore += weighted
    }

    // Flat RBI bonus — applied to the game total, not per-PA.
    // To make it leverage-weighted instead, move `0.30 * ab.rbi * leverage`
    // into the PA loop above and remove this line.
    const score = weightedScore + 0.30 * totalRbi

    const totalBases = singles + 2 * doubles + 3 * triples + 4 * hrs
    const hits = singles + doubles + triples + hrs
    const HITS = ['Single', 'Double', 'Triple', 'Home Run']
    const sacFlies = abs.filter((a) => !HITS.includes(a.result) && a.result !== 'Walk' && (a.rbi ?? 0) >= 1).length
    const ab = abs.filter((a) => a.result !== 'Walk' && !((!HITS.includes(a.result)) && (a.rbi ?? 0) >= 1)).length
    const obp = (ab + walks + sacFlies) > 0 ? (hits + walks) / (ab + walks + sacFlies) : 0
    const slg = ab > 0 ? totalBases / ab : 0

    results.push({
      player_id: pid,
      name,
      singles,
      doubles,
      triples,
      home_runs: hrs,
      walks,
      rbi: totalRbi,
      ab,
      score,
      totalBases,
      lateScore,
      ops: obp + slg,
    })
  }

  // Sort: 1) Score  2) Total bases  3) OPS  4) Late-inning score
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.totalBases !== a.totalBases) return b.totalBases - a.totalBases
    if (b.ops !== a.ops) return b.ops - a.ops
    return b.lateScore - a.lateScore
  })

  return results.slice(0, 3)
}

// ---------------------------------------------------------------------------
// Stat summary line shown under each star's name
// ---------------------------------------------------------------------------

function buildStatLine(p: PlayerPerf): string {
  const parts: string[] = []
  if (p.home_runs > 0) parts.push(`${p.home_runs} HR`)
  if (p.triples > 0) parts.push(`${p.triples} 3B`)
  if (p.doubles > 0) parts.push(`${p.doubles} 2B`)
  if (p.singles > 0) parts.push(`${p.singles} 1B`)
  if (p.walks > 0) parts.push(`${p.walks} BB`)
  return parts.join(', ') || '—'
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const RANK_LABELS = ['1ST', '2ND', '3RD']
const RANK_HEX = ['#FFD700', '#C0C0C0', '#CD7F32']

function formatGameLabel(g: Game, isFirst: boolean): string {
  const d = new Date(g.game_date + 'T00:00:00')
  const date = d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${isFirst ? '⭐ ' : ''}${date} vs ${g.opponent}`
}

interface StarColumnProps {
  rank: number
  player: PlayerPerf
  opponent: string
  hasLeverage: boolean
}

function StarColumn({ rank, player, opponent, hasLeverage }: StarColumnProps) {
  const color = RANK_HEX[rank]
  const statLine = buildStatLine(player)
  const sub = `${player.singles + player.doubles + player.triples + player.home_runs}-${player.ab}` +
    (player.rbi > 0 ? `, ${player.rbi} RBI` : '')

  return (
    <div
      className="flex flex-col"
      style={{ borderLeft: rank > 0 ? '1px solid rgba(255,255,255,0.1)' : undefined }}
    >
      <div className="overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
        <PlayerPhoto
          name={player.name}
          className="w-full h-full object-cover object-top !rounded-none"
        />
      </div>

      <div style={{ height: 4, backgroundColor: color }} />

      <div className="bg-[#0a1520] py-2 px-3 text-center">
        <p className="text-white font-bold text-sm uppercase tracking-widest truncate">
          {player.name}
        </p>
      </div>

      <div className="flex-1 bg-[#0d1b2a] py-6 px-4 text-center">
        <p className="font-black text-5xl mb-4" style={{ color }}>
          {RANK_LABELS[rank]}
        </p>
        <p className="text-white font-semibold text-base leading-snug">{statLine}</p>
        <p className="text-gray-400 text-sm mt-1">{sub}</p>
        <p className="text-gray-500 text-xs mt-4 uppercase tracking-widest">vs {opponent}</p>
        <p className="text-gray-600 text-xs mt-2">
          Score: {player.score.toFixed(2)}{!hasLeverage && ' (no leverage — add a game score)'}
        </p>
      </div>
    </div>
  )
}

export default function GameStars() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [atBats, setAtBats] = useState<GameAtBat[]>([])
  const [gameScore, setGameScore] = useState<GameScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGames().then((g) => setGames(g))
  }, [])

  const selectedGame = games[selectedIdx] ?? null

  useEffect(() => {
    if (!selectedGame) return
    setLoading(true)
    Promise.all([
      getGameAtBats(selectedGame.game_date, selectedGame.opponent),
      getGameScore(selectedGame.game_date, selectedGame.opponent),
    ])
      .then(([abs, score]) => {
        setAtBats(abs)
        setGameScore(score)
      })
      .finally(() => setLoading(false))
  }, [selectedGame?.game_date, selectedGame?.opponent])

  const hasLeverage =
    gameScore !== null && atBats.some((ab) => ab.inning !== null)

  const stars = computeStars(atBats, gameScore)

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">3 Stars of the Game</h1>
          {games.length > 0 && (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {games.map((g, i) => (
                <option key={`${g.game_date}-${g.opponent}`} value={i}>
                  {formatGameLabel(g, i === 0)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-[#1a2d4a] px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <h2 className="text-white font-black text-xl tracking-widest uppercase">
              3 Stars of the Game
            </h2>
          </div>

          {loading ? (
            <div className="bg-[#0d1b2a] py-24 text-center text-gray-500">Loading…</div>
          ) : stars.length === 0 ? (
            <div className="bg-[#0d1b2a] py-24 text-center text-gray-500">
              No at-bats recorded for this game.
            </div>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${stars.length}, 1fr)` }}
            >
              {stars.map((player, i) => (
                <StarColumn
                  key={player.player_id}
                  rank={i}
                  player={player}
                  opponent={selectedGame!.opponent}
                  hasLeverage={hasLeverage}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 px-1">
          <p className="text-xs text-gray-400">
            Algorithm: linear weights (HR=2.10, 3B=1.62, 2B=1.27, 1B=0.89, BB=0.69) × leverage
            (closeness × inning weight) + 0.30 × RBI.
            {hasLeverage
              ? ' Leverage active — game score and innings loaded.'
              : ' Leverage inactive — add a game score and inning data to enable it.'}
          </p>
        </div>
      </div>
    </div>
  )
}
