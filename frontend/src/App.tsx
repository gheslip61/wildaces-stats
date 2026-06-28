import { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d1b2a] flex items-center px-4 h-14 border-b border-white/10">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white text-2xl leading-none mr-4"
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="text-white font-bold text-base">Wild Aces Stats</span>
      </div>

      <main className="flex-1 md:ml-56 bg-gray-50 min-h-screen pt-14 md:pt-0 overflow-x-hidden">
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
