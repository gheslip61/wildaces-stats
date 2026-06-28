import { useEffect, useState } from 'react'
import { getGameScores, saveGameScore, deleteGameScore, type GameScore } from '../api'

const INNINGS = 7

function total(runs: number[]) {
  return runs.reduce((a, b) => a + b, 0)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function padToInnings(runs: number[], n = INNINGS): number[] {
  const arr = [...runs]
  while (arr.length < n) arr.push(0)
  return arr.slice(0, n)
}

interface BoxScoreCardProps {
  score: GameScore
  onUpdate: (updated: GameScore) => void
  onDelete: () => void
}

function BoxScoreCard({ score, onUpdate, onDelete }: BoxScoreCardProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<GameScore>({
    ...score,
    wild_aces_runs: padToInnings(score.wild_aces_runs),
    opponent_runs: padToInnings(score.opponent_runs),
  })

  const waTotal = total(editing ? draft.wild_aces_runs : score.wild_aces_runs)
  const oppTotal = total(editing ? draft.opponent_runs : score.opponent_runs)
  const isWin = waTotal > oppTotal
  const isLoss = waTotal < oppTotal
  const resultLabel = isWin ? 'W' : isLoss ? 'L' : 'T'
  const resultColor = isWin
    ? 'bg-green-100 text-green-700'
    : isLoss
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600'

  const innings = Array.from({ length: INNINGS }, (_, i) => i + 1)

  function setRun(team: 'wa' | 'opp', i: number, val: number) {
    const key = team === 'wa' ? 'wild_aces_runs' : 'opponent_runs'
    setDraft((prev) => {
      const arr = [...prev[key]]
      arr[i] = Math.max(0, val)
      return { ...prev, [key]: arr }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveGameScore(draft)
      onUpdate(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setDraft({
      ...score,
      wild_aces_runs: padToInnings(score.wild_aces_runs),
      opponent_runs: padToInnings(score.opponent_runs),
    })
    setEditing(false)
  }

  async function handleDelete() {
    await deleteGameScore(score.game_date, score.opponent)
    onDelete()
  }

  const displayRuns = (team: 'wa' | 'opp', n: number) => {
    const arr = team === 'wa' ? score.wild_aces_runs : score.opponent_runs
    return arr[n - 1] ?? <span className="text-gray-300">–</span>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div>
          <p className="font-semibold text-gray-800">{formatDate(score.game_date)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            vs {score.opponent}
            {score.is_home !== null && (
              <span className="ml-2 text-gray-400">
                ({score.is_home ? 'Home' : 'Away'})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!editing && (
            <>
              <span className="text-lg font-black text-[#7b2d8b]">
                {waTotal}–{oppTotal}
              </span>
              <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${resultColor}`}>
                {resultLabel}
              </span>
              <button
                onClick={() => { setEditing(true); setConfirmDelete(false) }}
                className="text-xs font-semibold text-gray-500 hover:text-[#7b2d8b] px-2 py-1 rounded hover:bg-purple-50 transition-colors"
              >
                Edit
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Delete?</span>
                  <button
                    onClick={handleDelete}
                    className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
            </>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Home/Away toggle — edit mode only */}
      {editing && (
        <div className="flex items-center gap-3 px-5 pt-3">
          <span className="text-xs font-medium text-gray-500">Wild Aces are:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 text-xs">
            {[{ label: 'Home', val: true }, { label: 'Away', val: false }].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, is_home: val }))}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  draft.is_home === val
                    ? 'bg-[#7b2d8b] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } ${label === 'Away' ? 'border-l border-gray-300' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Box score table */}
      <div className="overflow-x-auto px-5 py-4">
        <table className="text-sm min-w-full">
          <thead>
            <tr className="text-xs text-gray-400 uppercase">
              <th className="text-left pr-4 pb-2 min-w-[130px]" />
              {innings.map((n) => (
                <th key={n} className="w-10 text-center pb-2 font-medium">{n}</th>
              ))}
              <th className="w-10 text-center pb-2 font-bold text-gray-600">R</th>
            </tr>
          </thead>
          <tbody>
            {(['wa', 'opp'] as const).map((team, ti) => {
              const label = team === 'wa' ? 'Wild Aces' : score.opponent
              const labelClass = team === 'wa'
                ? 'font-semibold text-[#7b2d8b]'
                : 'text-gray-600'
              const runTotal = team === 'wa' ? waTotal : oppTotal
              const totalClass = team === 'wa'
                ? 'font-black text-[#7b2d8b] text-base'
                : 'font-bold text-gray-600 text-base'
              const draftRuns = team === 'wa' ? draft.wild_aces_runs : draft.opponent_runs

              return (
                <tr key={team} className={ti > 0 ? 'border-t border-gray-100' : ''}>
                  <td className={`pr-4 py-1.5 whitespace-nowrap ${labelClass}`}>{label}</td>
                  {innings.map((n) => (
                    <td key={n} className="text-center py-1.5 px-1">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={draftRuns[n - 1] ?? 0}
                          onChange={(e) => setRun(team, n - 1, Number(e.target.value))}
                          className="w-10 text-center border border-gray-300 rounded py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                        />
                      ) : (
                        <span className={team === 'wa' ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                          {displayRuns(team, n)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className={`text-center py-1.5 ${totalClass}`}>{runTotal}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function GameScores() {
  const [scores, setScores] = useState<GameScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGameScores()
      .then(setScores)
      .finally(() => setLoading(false))
  }, [])

  const wins = scores.filter((s) => total(s.wild_aces_runs) > total(s.opponent_runs)).length
  const losses = scores.filter((s) => total(s.wild_aces_runs) < total(s.opponent_runs)).length

  function handleUpdate(key: string, updated: GameScore) {
    setScores((prev) => prev.map((s) => (`${s.game_date}-${s.opponent}` === key ? updated : s)))
  }

  function handleDelete(key: string) {
    setScores((prev) => prev.filter((s) => `${s.game_date}-${s.opponent}` !== key))
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Game Scores</h1>
            {scores.length > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                Season record:{' '}
                <span className="font-semibold text-green-600">{wins}W</span>
                {' – '}
                <span className="font-semibold text-red-500">{losses}L</span>
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : scores.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
            <p className="text-gray-400 text-sm">No game scores recorded yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Add scores via Data Entry or scan a scoresheet with a completed line score.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scores.map((s) => {
              const key = `${s.game_date}-${s.opponent}`
              return (
                <BoxScoreCard
                  key={key}
                  score={s}
                  onUpdate={(updated) => handleUpdate(key, updated)}
                  onDelete={() => handleDelete(key)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
