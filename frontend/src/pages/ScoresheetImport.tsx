import { useEffect, useMemo, useState } from 'react'
import {
  getPlayers,
  scanScoresheet,
  logAtBatsBulk,
  saveGameScore,
  type Player,
  type ScannedAtBat,
  type LineScore,
} from '../api'

const RESULT_OPTIONS = ['Single', 'Double', 'Triple', 'Home Run', 'Walk', 'Strikeout', 'Out']

interface ReviewRow extends ScannedAtBat {
  player_id: number | '' // resolved roster id, '' = unmatched
  include: boolean
  inning: number | null
}

export default function ScoresheetImport() {
  const [players, setPlayers] = useState<Player[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  const [gameDate, setGameDate] = useState(new Date().toISOString().slice(0, 10))
  const [opponent, setOpponent] = useState('')
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [lineScore, setLineScore] = useState<LineScore | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    getPlayers().then(setPlayers)
  }, [])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    // HEIC won't render in <img>, but JPEG/PNG previews are still useful
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const nameToId = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of players) map.set(p.name.toLowerCase(), p.id)
    return map
  }, [players])

  function resolvePlayerId(name: string): number | '' {
    const exact = nameToId.get(name.toLowerCase())
    if (exact !== undefined) return exact
    // fall back to first/last-name containment match
    const lower = name.toLowerCase()
    const partial = players.find(
      (p) => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()),
    )
    return partial ? partial.id : ''
  }

  async function handleScan() {
    if (!file) return
    setScanning(true)
    setScanError('')
    setSaveMsg('')
    setRows(null)
    setLineScore(null)
    try {
      const result = await scanScoresheet(file)
      if (result.game_date) setGameDate(result.game_date)
      if (result.opponent) setOpponent(result.opponent)
      if (result.line_score) setLineScore(result.line_score)
      setRows(
        result.at_bats.map((ab) => {
          const id = resolvePlayerId(ab.player_name)
          return { ...ab, inning: ab.inning ?? null, player_id: id, include: id !== '' }
        }),
      )
    } catch (err: any) {
      setScanError(err?.response?.data?.detail || err?.message || 'Scan failed.')
    } finally {
      setScanning(false)
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev!.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeRow(index: number) {
    setRows((prev) => prev!.filter((_, i) => i !== index))
  }

  function addRow() {
    setRows((prev) => [
      ...(prev ?? []),
      {
        player_name: '',
        matched: false,
        result: 'Single',
        rbi: 0,
        inning: null,
        confidence: 1,
        note: 'added manually',
        player_id: players[0]?.id ?? '',
        include: true,
      },
    ])
  }

  const includedRows = rows?.filter((r) => r.include && r.player_id !== '') ?? []
  const excludedCount = (rows?.length ?? 0) - includedRows.length

  async function handleSave() {
    if (!opponent.trim()) {
      setSaveMsg('Enter the opponent name before saving.')
      return
    }
    if (includedRows.length === 0) return
    setSaving(true)
    setSaveMsg('')
    try {
      const inserted = await logAtBatsBulk(
        includedRows.map((r) => ({
          player_id: r.player_id as number,
          game_date: gameDate,
          opponent: opponent.trim(),
          result: r.result,
          rbi: r.rbi,
          inning: r.inning ?? null,
        })),
      )
      if (lineScore && (lineScore.wild_aces_runs.length > 0 || lineScore.opponent_runs.length > 0)) {
        await saveGameScore({
          game_date: gameDate,
          opponent: opponent.trim(),
          is_home: lineScore.is_home,
          wild_aces_runs: lineScore.wild_aces_runs,
          opponent_runs: lineScore.opponent_runs,
        })
      }
      setSaveMsg(`${inserted} at-bats saved to the database.${lineScore ? ' Game score saved.' : ''}`)
      setRows(null)
      setLineScore(null)
      setFile(null)
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.detail || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  function confidenceBadge(c: number) {
    const pct = Math.round(c * 100)
    const color =
      c >= 0.8
        ? 'bg-green-100 text-green-700'
        : c >= 0.5
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-red-100 text-red-700'
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Scoresheet Import</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a photo of a scoresheet, let AI extract the at-bats, then review and correct
        everything before it's saved. Nothing touches the database until you confirm.
      </p>

      {/* Step 1 — upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">1. Upload Scoresheet Photo</h2>
        <div className="flex flex-wrap items-start gap-6">
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*,.heic,.heif"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setRows(null)
                setSaveMsg('')
              }}
              className="block text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-[#7b2d8b] file:text-white file:font-semibold file:text-sm file:cursor-pointer hover:file:bg-[#6a2578]"
            />
            <p className="text-xs text-gray-400">
              JPEG, PNG, and iPhone HEIC photos all work. Clear, straight-on, well-lit photos scan
              best.
            </p>
            <button
              onClick={handleScan}
              disabled={!file || scanning}
              className="bg-[#7b2d8b] hover:bg-[#6a2578] disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {scanning ? 'Scanning… this can take a minute' : 'Scan Scoresheet'}
            </button>
            {scanError && <p className="text-red-500 text-sm">{scanError}</p>}
          </div>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Scoresheet preview"
              className="max-h-64 rounded-lg border border-gray-200"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
        </div>
      </div>

      {/* Step 2 — review */}
      {rows && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-1">2. Review Extracted At-Bats</h2>
          <p className="text-xs text-gray-400 mb-4">
            Fix any misreads. Rows without a matched player are excluded until you assign one.
            Uncheck a row to skip it.
          </p>

          <div className="flex flex-wrap gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Game Date</label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                placeholder="Opponent name"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
              />
            </div>
          </div>

          {/* Line score preview */}
          {lineScore && (
            <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Line Score{' '}
                <span className="text-xs font-normal text-gray-400">
                  — extracted from scoresheet. Edit if needed before saving.
                </span>
              </p>
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase">
                      <th className="text-left pr-3 pb-1 min-w-[90px]" />
                      {Array.from(
                        { length: Math.max(lineScore.wild_aces_runs.length, lineScore.opponent_runs.length, 7) },
                        (_, i) => <th key={i} className="w-10 text-center pb-1">{i + 1}</th>,
                      )}
                      <th className="w-10 text-center pb-1 font-bold text-gray-600">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['wild_aces', 'opponent'] as const).map((team) => {
                      const runsKey = team === 'wild_aces' ? 'wild_aces_runs' : 'opponent_runs'
                      const runs = lineScore[runsKey]
                      const numInnings = Math.max(
                        lineScore.wild_aces_runs.length,
                        lineScore.opponent_runs.length,
                        7,
                      )
                      return (
                        <tr key={team} className={team === 'opponent' ? 'border-t border-gray-200' : ''}>
                          <td className={`pr-3 py-1 font-semibold whitespace-nowrap ${team === 'wild_aces' ? 'text-[#7b2d8b]' : 'text-gray-500'}`}>
                            {team === 'wild_aces' ? 'Wild Aces' : (opponent || 'Opponent')}
                          </td>
                          {Array.from({ length: numInnings }, (_, i) => (
                            <td key={i} className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={runs[i] ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value))
                                  setLineScore((prev) => {
                                    if (!prev) return prev
                                    const arr = [...prev[runsKey]]
                                    while (arr.length <= i) arr.push(0)
                                    arr[i] = val
                                    return { ...prev, [runsKey]: arr }
                                  })
                                }}
                                className="w-10 text-center border border-gray-300 rounded py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                              />
                            </td>
                          ))}
                          <td className={`px-1 py-1 text-center font-bold ${team === 'wild_aces' ? 'text-[#7b2d8b]' : 'text-gray-600'}`}>
                            {runs.reduce((a: number, b: number) => a + b, 0)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-500">Wild Aces are:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-300 text-xs">
                  {[{ label: 'Home', val: true }, { label: 'Away', val: false }].map(({ label, val }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setLineScore((prev) => prev ? { ...prev, is_home: val } : prev)}
                      className={`px-3 py-1 font-medium transition-colors ${
                        lineScore.is_home === val
                          ? 'bg-[#7b2d8b] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      } ${label === 'Away' ? 'border-l border-gray-300' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No at-bats were detected in this image.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="py-2 pr-2">Use</th>
                    <th className="py-2 pr-2">Read As</th>
                    <th className="py-2 pr-2">Player</th>
                    <th className="py-2 pr-2">Inn.</th>
                    <th className="py-2 pr-2">Result</th>
                    <th className="py-2 pr-2">RBI</th>
                    <th className="py-2 pr-2">Confidence</th>
                    <th className="py-2 pr-2">Note</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${!r.include ? 'opacity-40' : ''} ${
                        r.player_id === '' ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(i, { include: e.target.checked })}
                          className="accent-[#7b2d8b]"
                        />
                      </td>
                      <td className="py-2 pr-2 text-gray-500">{r.player_name || '—'}</td>
                      <td className="py-2 pr-2">
                        <select
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                          value={r.player_id}
                          onChange={(e) =>
                            updateRow(i, {
                              player_id: e.target.value === '' ? '' : Number(e.target.value),
                              include: e.target.value !== '',
                            })
                          }
                        >
                          <option value="">-- unmatched --</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          max={9}
                          placeholder="—"
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-14 focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                          value={r.inning ?? ''}
                          onChange={(e) =>
                            updateRow(i, { inning: e.target.value === '' ? null : Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                          value={r.result}
                          onChange={(e) => updateRow(i, { result: e.target.value })}
                        >
                          {RESULT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          max={4}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                          value={r.rbi}
                          onChange={(e) => updateRow(i, { rbi: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 pr-2">{confidenceBadge(r.confidence)}</td>
                      <td className="py-2 pr-2 text-xs text-gray-400 max-w-[160px]">{r.note}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-red-400 hover:text-red-600 text-xs font-semibold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={addRow}
            className="mt-3 text-sm text-[#7b2d8b] font-semibold hover:underline"
          >
            + Add a missed at-bat
          </button>
        </div>
      )}

      {/* Step 3 — confirm */}
      {rows && rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-2">3. Confirm &amp; Save</h2>
          <p className="text-sm text-gray-500 mb-4">
            {includedRows.length} at-bat{includedRows.length === 1 ? '' : 's'} will be saved
            {excludedCount > 0 && ` (${excludedCount} excluded)`} for{' '}
            <span className="font-semibold text-gray-700">
              {gameDate} vs {opponent || '—'}
            </span>
            .
          </p>
          <button
            onClick={handleSave}
            disabled={saving || includedRows.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Saving…' : `Save ${includedRows.length} At-Bats`}
          </button>
        </div>
      )}

      {saveMsg && <p className="mt-4 text-green-600 font-semibold text-sm">{saveMsg}</p>}
    </div>
  )
}
