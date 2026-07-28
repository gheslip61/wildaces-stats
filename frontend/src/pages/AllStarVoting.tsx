import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlayerPhoto from '../components/PlayerPhoto'
import {
  getTeamStats,
  checkAllStarVote,
  submitAllStarVote,
} from '../api'
import type { TeamStatsRow } from '../api'

const VOTER_KEY = 'allstar_voter_id'

function getOrCreateVoterId(): string {
  let id = localStorage.getItem(VOTER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VOTER_KEY, id)
  }
  return id
}

// Selection order determines vote weight:
// index 0 → 3 votes, index 1-2 → 2 votes, index 3-4 → 1 vote
function getVoteWeight(index: number): number {
  if (index === 0) return 3
  if (index <= 2) return 2
  return 1
}

const TIER_STYLES = [
  { border: '#7b2d8b', bg: 'rgba(123,45,139,0.12)', label: '3 VOTES', dot: '#7b2d8b' },
  { border: '#a04bb8', bg: 'rgba(160,75,184,0.10)', label: '2 VOTES', dot: '#a04bb8' },
  { border: '#a04bb8', bg: 'rgba(160,75,184,0.10)', label: '2 VOTES', dot: '#a04bb8' },
  { border: '#c490d1', bg: 'rgba(196,144,209,0.10)', label: '1 VOTE', dot: '#c490d1' },
  { border: '#c490d1', bg: 'rgba(196,144,209,0.10)', label: '1 VOTE', dot: '#c490d1' },
]

export default function AllStarVoting() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<TeamStatsRow[]>([])
  const [selected, setSelected] = useState<number[]>([]) // player_ids in selection order
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const voterId = getOrCreateVoterId()
    Promise.all([getTeamStats(), checkAllStarVote(voterId)]).then(([stats, hasVoted]) => {
      if (hasVoted) {
        navigate('/all-star-results')
        return
      }
      setPlayers(stats.filter((p) => (p.ab ?? 0) > 0))
      setLoading(false)
    })
  }, [navigate])

  function togglePlayer(playerId: number) {
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId)
      if (prev.length >= 5) return prev
      return [...prev, playerId]
    })
  }

  async function handleSubmit() {
    if (selected.length !== 5) return
    setSubmitting(true)
    setError('')
    try {
      const voterId = getOrCreateVoterId()
      const votes = selected.map((playerId, i) => ({
        player_id: playerId,
        vote_weight: getVoteWeight(i),
      }))
      await submitAllStarVote(voterId, votes)
      localStorage.setItem(`${VOTER_KEY}_done`, '1')
      navigate('/all-star-results')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const remaining = 5 - selected.length

  if (loading) {
    return <div className="p-4 md:p-6 text-gray-500">Loading…</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 bg-gray-50 pb-4 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">All-Star Vote</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {remaining > 0
                ? `Select ${remaining} more player${remaining !== 1 ? 's' : ''}`
                : 'Ready to submit!'}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={selected.length !== 5 || submitting}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              selected.length === 5
                ? 'bg-[#7b2d8b] text-white hover:bg-[#6a2278] shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Submitting…' : 'Submit Votes'}
          </button>
        </div>

        {/* Vote tier legend */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {[
            { color: '#7b2d8b', label: '1st pick — 3 votes' },
            { color: '#a04bb8', label: '2nd & 3rd pick — 2 votes' },
            { color: '#c490d1', label: '4th & 5th pick — 1 vote' },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
            </div>
          ))}
        </div>

        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
        {players.map((player) => {
          const selIdx = selected.indexOf(player.player_id)
          const isSelected = selIdx !== -1
          const tier = isSelected ? TIER_STYLES[selIdx] : null

          return (
            <button
              key={player.player_id}
              onClick={() => togglePlayer(player.player_id)}
              disabled={!isSelected && selected.length >= 5}
              className="text-left rounded-xl overflow-hidden border-2 transition-all focus:outline-none"
              style={{
                borderColor: tier ? tier.border : '#e5e7eb',
                backgroundColor: tier ? tier.bg : 'white',
                opacity: !isSelected && selected.length >= 5 ? 0.45 : 1,
                boxShadow: isSelected ? `0 0 0 2px ${tier!.border}40` : undefined,
              }}
            >
              {/* Photo */}
              <div className="relative">
                <PlayerPhoto
                  name={player.name}
                  className="w-full h-28 object-cover object-top !rounded-none"
                />
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 text-white text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tier!.border }}
                  >
                    {tier!.label}
                  </div>
                )}
                {isSelected && (
                  <div
                    className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                    style={{ backgroundColor: tier!.border }}
                  >
                    {selIdx + 1}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="font-bold text-sm text-gray-800 truncate">{player.name}</p>
                <div className="grid grid-cols-3 gap-x-1 mt-1.5">
                  {[
                    { label: 'BA', val: player.ba.toFixed(3) },
                    { label: 'OBP', val: player.obp.toFixed(3) },
                    { label: 'OPS', val: player.ops.toFixed(3) },
                    { label: 'H', val: player.hits },
                    { label: 'HR', val: player.home_runs },
                    { label: 'RBI', val: player.rbi },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-gray-400 text-xs leading-none">{s.label}</p>
                      <p className="text-gray-800 text-xs font-semibold leading-tight">{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
