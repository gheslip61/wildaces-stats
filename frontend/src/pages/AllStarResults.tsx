import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlayerPhoto from '../components/PlayerPhoto'
import { getAllStarResults } from '../api'
import type { AllStarResult } from '../api'

const VOTER_KEY = 'allstar_voter_id'

export default function AllStarResults() {
  const navigate = useNavigate()
  const [results, setResults] = useState<AllStarResult[]>([])
  const [loading, setLoading] = useState(true)
  const hasVoted = !!localStorage.getItem(`${VOTER_KEY}_done`)

  useEffect(() => {
    getAllStarResults().then((data) => {
      setResults(data.filter((r) => r.total_votes > 0))
      setLoading(false)
    })
  }, [])

  const maxVotes = Math.max(...results.map((r) => r.total_votes), 1)

  if (loading) {
    return <div className="p-4 md:p-6 text-gray-500">Loading…</div>
  }

  if (results.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">All-Star Results</h1>
        <p className="text-gray-500">No votes have been cast yet.</p>
        {!hasVoted && (
          <button
            onClick={() => navigate('/all-star-voting')}
            className="mt-4 px-5 py-2 bg-[#7b2d8b] text-white rounded-lg text-sm font-semibold hover:bg-[#6a2278]"
          >
            Cast Your Vote
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">All-Star Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live voting standings</p>
        </div>
        {!hasVoted && (
          <button
            onClick={() => navigate('/all-star-voting')}
            className="px-5 py-2 bg-[#7b2d8b] text-white rounded-lg text-sm font-semibold hover:bg-[#6a2278]"
          >
            Cast Your Vote
          </button>
        )}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-[#0d1b2a] px-4 py-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Vote Totals</h2>
        </div>
        <div className="p-4 space-y-3">
          {results.map((player, i) => (
            <div key={player.player_id} className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-4 text-right shrink-0">{i + 1}</span>
              <div className="w-8 h-8 shrink-0 overflow-hidden rounded-full border border-gray-200">
                <PlayerPhoto
                  name={player.name}
                  className="w-full h-full object-cover object-top !rounded-none"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800 truncate">{player.name}</span>
                  <span className="text-sm font-bold text-[#7b2d8b] ml-2 shrink-0">{player.total_votes} pts</span>
                </div>
                {/* Stacked bar */}
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                  {player.votes_3 > 0 && (
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(player.votes_3 * 3 / maxVotes) * 100}%`,
                        backgroundColor: '#7b2d8b',
                      }}
                    />
                  )}
                  {player.votes_2 > 0 && (
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(player.votes_2 * 2 / maxVotes) * 100}%`,
                        backgroundColor: '#a04bb8',
                      }}
                    />
                  )}
                  {player.votes_1 > 0 && (
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(player.votes_1 * 1 / maxVotes) * 100}%`,
                        backgroundColor: '#c490d1',
                      }}
                    />
                  )}
                </div>
                {/* Breakdown */}
                <div className="flex gap-3 mt-1">
                  {player.votes_3 > 0 && (
                    <span className="text-xs text-gray-400">{player.votes_3}×3pt</span>
                  )}
                  {player.votes_2 > 0 && (
                    <span className="text-xs text-gray-400">{player.votes_2}×2pt</span>
                  )}
                  {player.votes_1 > 0 && (
                    <span className="text-xs text-gray-400">{player.votes_1}×1pt</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
