import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

export interface Player {
  id: number
  name: string
  team?: string
  position?: string
  handedness?: string
}

export interface StatsRow {
  ab: number
  hits: number
  singles: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  strikeouts: number
  rbi: number
  ba: number
  obp: number
  slg: number
  ops: number
}

export interface GameStatsRow extends StatsRow {
  game_date: string
  opponent: string
}

export interface TeamStatsRow extends StatsRow {
  player_id: number
  name: string
}

export interface AtBat {
  id: number
  game_date: string
  opponent: string
  result: string
  rbi: number
  inning?: number | null
  created_at?: string
}

export interface GameAtBat {
  id: number
  player_id: number
  player_name: string
  result: string
  rbi: number
  inning: number | null
}

export interface Game {
  game_date: string
  opponent: string
}

export interface LineupSpot {
  spot: number
  label: string
  player_id: number
  name: string
  ops: number
  obp: number
  slg: number
  ba: number
  ab: number
  hits: number
  home_runs: number
  rbi: number
}

export interface GameScore {
  game_date: string
  opponent: string
  is_home: boolean | null
  wild_aces_runs: number[]
  opponent_runs: number[]
}

export interface ScannedAtBat {
  player_name: string
  matched: boolean
  result: string
  rbi: number
  inning: number | null
  confidence: number
  note: string
}

export interface LineScore {
  wild_aces_runs: number[]
  opponent_runs: number[]
  is_home: boolean | null
}

export interface ScanResult {
  game_date: string | null
  opponent: string | null
  line_score: LineScore | null
  at_bats: ScannedAtBat[]
}

// Auth
export async function verifyPassword(password: string): Promise<boolean> {
  const res = await client.post<{ success: boolean }>('/api/auth/verify', { password })
  return res.data.success
}

// Players
export async function getPlayers(): Promise<Player[]> {
  const res = await client.get<Player[]>('/api/players')
  return res.data
}

export async function createPlayer(
  name: string,
  team: string,
  position: string,
  handedness = '',
): Promise<Player> {
  const res = await client.post<Player>('/api/players', { name, team, position, handedness })
  return res.data
}

export async function deletePlayer(id: number): Promise<void> {
  await client.delete(`/api/players/${id}`)
}

// Player stats
export async function getPlayerStats(playerId: number): Promise<StatsRow> {
  const res = await client.get<StatsRow>(`/api/players/${playerId}/stats`)
  return res.data
}

export async function getGameStats(playerId: number): Promise<GameStatsRow[]> {
  const res = await client.get<GameStatsRow[]>(`/api/players/${playerId}/game-stats`)
  return res.data
}

export async function getAtBats(playerId: number): Promise<AtBat[]> {
  const res = await client.get<AtBat[]>(`/api/players/${playerId}/at-bats`)
  return res.data
}

// At-bats
export async function logAtBat(
  playerId: number,
  gameDate: string,
  opponent: string,
  result: string,
  rbi: number,
  inning?: number | null,
): Promise<void> {
  await client.post('/api/at-bats', {
    player_id: playerId,
    game_date: gameDate,
    opponent,
    result,
    rbi,
    inning: inning ?? null,
  })
}

export async function removeAtBat(id: number): Promise<void> {
  await client.delete(`/api/at-bats/${id}`)
}

export async function logAtBatsBulk(
  atBats: { player_id: number; game_date: string; opponent: string; result: string; rbi: number; inning?: number | null }[],
): Promise<number> {
  const res = await client.post<{ inserted: number }>('/api/at-bats/bulk', { at_bats: atBats })
  return res.data.inserted
}

// Scoresheet
export async function scanScoresheet(file: File): Promise<ScanResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await client.post<ScanResult>('/api/scoresheet/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000, // vision scans can take a couple of minutes
  })
  return res.data
}

// Team
export async function getTeamStats(): Promise<TeamStatsRow[]> {
  const res = await client.get<TeamStatsRow[]>('/api/team/stats')
  return res.data
}

export async function getTeamStatsForGame(date: string, opponent: string): Promise<TeamStatsRow[]> {
  const res = await client.get<TeamStatsRow[]>('/api/team/stats/game', {
    params: { date, opponent },
  })
  return res.data
}

// All per-game stats for every player (used for recency-weighted lineup)
export interface PlayerGameStats {
  player_id: number
  name: string
  game_date: string
  opponent: string
  ab: number
  hits: number
  singles: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  strikeouts: number
  sac_flies: number
  rbi: number
}

export async function getAllPlayerGameStats(): Promise<PlayerGameStats[]> {
  const res = await client.get<PlayerGameStats[]>('/api/team/game-stats-all')
  return res.data
}

// Game at-bats (per-PA with inning, used for 3 Stars algorithm)
export async function getGameAtBats(date: string, opponent: string): Promise<GameAtBat[]> {
  const res = await client.get<GameAtBat[]>('/api/games/at-bats', { params: { date, opponent } })
  return res.data
}

export async function getGameScore(date: string, opponent: string): Promise<GameScore | null> {
  const res = await client.get<GameScore | null>('/api/games/scores/single', { params: { date, opponent } })
  return res.data
}

// Games
export async function getGames(): Promise<Game[]> {
  const res = await client.get<Game[]>('/api/games')
  return res.data
}

// Game scores
export async function getGameScores(): Promise<GameScore[]> {
  const res = await client.get<GameScore[]>('/api/games/scores')
  return res.data
}

export async function saveGameScore(score: Omit<GameScore, 'id'>): Promise<void> {
  await client.post('/api/games/scores', score)
}

export async function deleteGameScore(date: string, opponent: string): Promise<void> {
  await client.delete('/api/games/scores', { params: { date, opponent } })
}

// Lineup
export async function getOptimalLineup(): Promise<LineupSpot[]> {
  const res = await client.get<LineupSpot[]>('/api/lineup/optimal')
  return res.data
}

// All-Star Voting
export interface AllStarVoteItem {
  player_id: number
  vote_weight: number
}

export interface AllStarResult {
  player_id: number
  name: string
  total_votes: number
  votes_3: number
  votes_2: number
  votes_1: number
}

export async function checkAllStarVote(voterId: string): Promise<boolean> {
  const res = await client.get<{ has_voted: boolean }>('/api/allstar/check', { params: { voter_id: voterId } })
  return res.data.has_voted
}

export async function submitAllStarVote(voterId: string, votes: AllStarVoteItem[]): Promise<void> {
  await client.post('/api/allstar/vote', { voter_id: voterId, votes })
}

export async function getAllStarResults(): Promise<AllStarResult[]> {
  const res = await client.get<AllStarResult[]>('/api/allstar/results')
  return res.data
}
