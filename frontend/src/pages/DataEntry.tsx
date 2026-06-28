import { useEffect, useState } from 'react'
import {
  verifyPassword,
  getPlayers,
  getAtBats,
  logAtBat,
  removeAtBat,
  createPlayer,
  deletePlayer,
  saveGameScore,
  type Player,
  type AtBat,
} from '../api'

const RESULT_OPTIONS = ['Single', 'Double', 'Triple', 'Home Run', 'Walk', 'Strikeout', 'Out']

const AUTH_KEY = 'wa_auth'
const GAME_DATE_KEY = 'wa_game_date'
const OPPONENT_KEY = 'wa_opponent'

export default function DataEntry() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === '1')
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  // Game info
  const [gameDate, setGameDate] = useState(
    () => localStorage.getItem(GAME_DATE_KEY) || new Date().toISOString().slice(0, 10),
  )
  const [opponent, setOpponent] = useState(() => localStorage.getItem(OPPONENT_KEY) || '')

  // Log at-bat
  const [players, setPlayers] = useState<Player[]>([])
  const [logPlayerId, setLogPlayerId] = useState<number | ''>('')
  const [logResult, setLogResult] = useState(RESULT_OPTIONS[0])
  const [logRBI, setLogRBI] = useState(0)
  const [logInning, setLogInning] = useState<number | ''>(1)
  const [logMsg, setLogMsg] = useState('')

  // Remove at-bat
  const [removePlayerId, setRemovePlayerId] = useState<number | ''>('')
  const [removeAtBats, setRemoveAtBats] = useState<AtBat[]>([])
  const [removeAtBatId, setRemoveAtBatId] = useState<number | ''>('')
  const [removeMsg, setRemoveMsg] = useState('')

  // Add player
  const [newName, setNewName] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [newHandedness, setNewHandedness] = useState('')
  const [addMsg, setAddMsg] = useState('')

  // Delete player
  const [deletePlayerId, setDeletePlayerId] = useState<number | ''>('')
  const [deleteMsg, setDeleteMsg] = useState('')

  // Game score
  const INNINGS = 7
  const [scoreIsHome, setScoreIsHome] = useState<boolean>(true)
  const [waRuns, setWaRuns] = useState<number[]>(Array(INNINGS).fill(0))
  const [oppRuns, setOppRuns] = useState<number[]>(Array(INNINGS).fill(0))
  const [scoreMsg, setScoreMsg] = useState('')

  useEffect(() => {
    if (authed) {
      getPlayers().then((data) => {
        setPlayers(data)
        if (data.length > 0) {
          setLogPlayerId(data[0].id)
          setRemovePlayerId(data[0].id)
          setDeletePlayerId(data[0].id)
        }
      })
    }
  }, [authed])

  useEffect(() => {
    localStorage.setItem(GAME_DATE_KEY, gameDate)
  }, [gameDate])

  useEffect(() => {
    localStorage.setItem(OPPONENT_KEY, opponent)
  }, [opponent])

  useEffect(() => {
    if (removePlayerId !== '') {
      getAtBats(removePlayerId as number).then(setRemoveAtBats)
    }
  }, [removePlayerId])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    const ok = await verifyPassword(pwInput)
    if (ok) {
      localStorage.setItem(AUTH_KEY, '1')
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('Incorrect password.')
    }
  }

  async function handleLogAtBat(e: React.FormEvent) {
    e.preventDefault()
    if (!logPlayerId || !gameDate || !opponent) {
      setLogMsg('Please fill in all fields including game date and opponent.')
      return
    }
    await logAtBat(logPlayerId as number, gameDate, opponent, logResult, logRBI, logInning || null)
    setLogMsg('At-bat logged successfully.')
    setLogRBI(0)
  }

  async function handleRemoveAtBat(e: React.FormEvent) {
    e.preventDefault()
    if (!removeAtBatId) return
    await removeAtBat(removeAtBatId as number)
    setRemoveMsg('At-bat removed.')
    getAtBats(removePlayerId as number).then(setRemoveAtBats)
    setRemoveAtBatId('')
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const p = await createPlayer(newName.trim(), newTeam.trim(), newPosition.trim(), newHandedness)
    setPlayers((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))
    setAddMsg(`${p.name} added.`)
    setNewName('')
    setNewTeam('')
    setNewPosition('')
    setNewHandedness('')
  }

  function setRunsInning(
    team: 'wa' | 'opp',
    inning: number,
    value: number,
  ) {
    const setter = team === 'wa' ? setWaRuns : setOppRuns
    setter((prev) => prev.map((v, i) => (i === inning ? Math.max(0, value) : v)))
  }

  async function handleSaveScore(e: React.FormEvent) {
    e.preventDefault()
    if (!gameDate || !opponent.trim()) {
      setScoreMsg('Set Game Date and Opponent at the top before saving a score.')
      return
    }
    await saveGameScore({
      game_date: gameDate,
      opponent: opponent.trim(),
      is_home: scoreIsHome,
      wild_aces_runs: waRuns,
      opponent_runs: oppRuns,
    })
    setScoreMsg('Game score saved.')
  }

  async function handleDeletePlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!deletePlayerId) return
    const name = players.find((p) => p.id === deletePlayerId)?.name
    await deletePlayer(deletePlayerId as number)
    setPlayers((prev) => prev.filter((p) => p.id !== deletePlayerId))
    setDeleteMsg(`${name} removed.`)
    setDeletePlayerId('')
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Data Entry</h2>
          <p className="text-sm text-gray-500 mb-5">Enter the password to continue.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
              placeholder="Password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
            />
            {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
            <button
              type="submit"
              className="w-full bg-[#7b2d8b] hover:bg-[#6a2578] text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Data Entry</h1>
        <button
          className="text-xs text-gray-400 underline"
          onClick={() => {
            localStorage.removeItem(AUTH_KEY)
            setAuthed(false)
          }}
        >
          Lock
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Game Info</h2>
            <div className="flex flex-wrap gap-4">
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
          </div>

          {/* Log At-Bat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Log At-Bat</h2>
            <form onSubmit={handleLogAtBat} className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={logPlayerId}
                  onChange={(e) => setLogPlayerId(Number(e.target.value))}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={logResult}
                  onChange={(e) => setLogResult(e.target.value)}
                >
                  {RESULT_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inning</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={logInning}
                  onChange={(e) => setLogInning(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RBI</label>
                <input
                  type="number"
                  min={0}
                  max={4}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={logRBI}
                  onChange={(e) => setLogRBI(Number(e.target.value))}
                />
              </div>
              <button
                type="submit"
                className="bg-[#7b2d8b] hover:bg-[#6a2578] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Log At-Bat
              </button>
            </form>
            {logMsg && <p className="mt-2 text-green-600 text-sm">{logMsg}</p>}
          </div>

          {/* Game Score */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-1">Game Score</h2>
            <p className="text-xs text-gray-400 mb-4">
              Uses the Game Date and Opponent set above. Saving again will overwrite the existing score.
            </p>
            <form onSubmit={handleSaveScore} className="space-y-4">
              {/* Home / Away toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Wild Aces are:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
                  <button
                    type="button"
                    onClick={() => setScoreIsHome(true)}
                    className={`px-4 py-1.5 font-medium transition-colors ${
                      scoreIsHome ? 'bg-[#7b2d8b] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreIsHome(false)}
                    className={`px-4 py-1.5 font-medium transition-colors border-l border-gray-300 ${
                      !scoreIsHome ? 'bg-[#7b2d8b] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Away
                  </button>
                </div>
              </div>

              {/* Inning grid */}
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase">
                      <th className="text-left pr-3 pb-1 min-w-[90px]" />
                      {Array.from({ length: INNINGS }, (_, i) => (
                        <th key={i} className="w-12 text-center pb-1">{i + 1}</th>
                      ))}
                      <th className="w-12 text-center pb-1 text-gray-600 font-bold">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Wild Aces row */}
                    <tr>
                      <td className="pr-3 py-1 font-semibold text-[#7b2d8b] whitespace-nowrap">Wild Aces</td>
                      {waRuns.map((v, i) => (
                        <td key={i} className="px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={v}
                            onChange={(e) => setRunsInning('wa', i, Number(e.target.value))}
                            className="w-10 text-center border border-gray-300 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center font-bold text-[#7b2d8b]">
                        {waRuns.reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                    {/* Opponent row */}
                    <tr>
                      <td className="pr-3 py-1 text-gray-500 whitespace-nowrap truncate max-w-[90px]">
                        {opponent || 'Opponent'}
                      </td>
                      {oppRuns.map((v, i) => (
                        <td key={i} className="px-1 py-1">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={v}
                            onChange={(e) => setRunsInning('opp', i, Number(e.target.value))}
                            className="w-10 text-center border border-gray-300 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center font-bold text-gray-600">
                        {oppRuns.reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                type="submit"
                className="bg-[#7b2d8b] hover:bg-[#6a2578] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Save Score
              </button>
            </form>
            {scoreMsg && <p className="mt-2 text-green-600 text-sm">{scoreMsg}</p>}
          </div>

          {/* Remove At-Bat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Remove At-Bat</h2>
            <form onSubmit={handleRemoveAtBat} className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={removePlayerId}
                  onChange={(e) => setRemovePlayerId(Number(e.target.value))}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">At-Bat</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b] max-w-xs"
                  value={removeAtBatId}
                  onChange={(e) => setRemoveAtBatId(Number(e.target.value))}
                >
                  <option value="">-- select --</option>
                  {removeAtBats.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.game_date} vs {a.opponent} — {a.result} ({a.rbi} RBI)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!removeAtBatId}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Remove
              </button>
            </form>
            {removeMsg && <p className="mt-2 text-green-600 text-sm">{removeMsg}</p>}
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="space-y-6">
          {/* Add Player */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Add Player</h2>
            <form onSubmit={handleAddPlayer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  placeholder="Full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  placeholder="Team name"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  placeholder="e.g. SS, CF"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Handedness</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={newHandedness}
                  onChange={(e) => setNewHandedness(e.target.value)}
                >
                  <option value="">-- select --</option>
                  <option value="Right">Right</option>
                  <option value="Left">Left</option>
                  <option value="Switch">Switch</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-[#7b2d8b] hover:bg-[#6a2578] text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                Add Player
              </button>
            </form>
            {addMsg && <p className="mt-2 text-green-600 text-sm">{addMsg}</p>}
          </div>

          {/* Remove Player */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Remove Player</h2>
            <form onSubmit={handleDeletePlayer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Player</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b2d8b]"
                  value={deletePlayerId}
                  onChange={(e) => setDeletePlayerId(Number(e.target.value))}
                >
                  <option value="">-- select --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!deletePlayerId}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                Remove Player
              </button>
            </form>
            {deleteMsg && <p className="mt-2 text-green-600 text-sm">{deleteMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
