import { Link, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TournamentLeaderboardPage from './pages/TournamentLeaderboardPage';
import TournamentCategoryPage from './pages/TournamentCategoryPage';
import EventLeaderboardPage from './pages/EventLeaderboardPage';
import ArcherProfilePage from './pages/ArcherProfilePage';

export default function App(): JSX.Element {
  return (
    <div className="layout">
      <header>
        <div className="container">
          <nav>
            <Link to="/" className="brand">
              Quiver League Tracker
            </Link>
            <div className="links">
              <Link to="/">Tournaments</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments/:tournamentId" element={<TournamentCategoryPage />} />
          <Route
            path="/tournaments/:tournamentId/categories"
            element={<TournamentCategoryPage />}
          />
          <Route
            path="/tournaments/:tournamentId/overall"
            element={<TournamentLeaderboardPage />}
          />
          <Route path="/events/:eventId" element={<EventLeaderboardPage />} />
          <Route path="/archers/:archerId" element={<ArcherProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>
        Crafted for The Quiver Archery League • Data updates via BetweenEnds Tracker
      </footer>
    </div>
  );
}
