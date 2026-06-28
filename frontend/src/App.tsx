import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import PlayerStats from './pages/PlayerStats'
import TeamStats from './pages/TeamStats'
import StatLeaders from './pages/StatLeaders'
import AtBatHistory from './pages/AtBatHistory'
import OptimalLineup from './pages/OptimalLineup'
import DataEntry from './pages/DataEntry'
import ScoresheetImport from './pages/ScoresheetImport'
import GameStars from './pages/GameStars'
import GameScores from './pages/GameScores'

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/player-stats" element={<PlayerStats />} />
          <Route path="/team-stats" element={<TeamStats />} />
          <Route path="/stat-leaders" element={<StatLeaders />} />
          <Route path="/at-bat-history" element={<AtBatHistory />} />
          <Route path="/optimal-lineup" element={<OptimalLineup />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/scoresheet-import" element={<ScoresheetImport />} />
          <Route path="/game-stars" element={<GameStars />} />
          <Route path="/game-scores" element={<GameScores />} />
        </Routes>
      </main>
    </div>
  )
}
