import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { logoutAdmin } from './api/client';
import RequireAdminAuth from './components/RequireAdminAuth';
import { useAdminSession } from './hooks/useAdminSession';
import HomePage from './pages/HomePage';
import AdminHomePage from './pages/AdminHomePage';
import AdminTournamentsPage from './pages/AdminTournamentsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import TournamentCategoryPage from './pages/TournamentCategoryPage';
import TournamentDashboardPage from './pages/TournamentDashboardPage';
import EventCategoryDetailPage from './pages/EventCategoryDetailPage';
import EventLeaderboardPage from './pages/EventLeaderboardPage';
import ArcherProfilePage from './pages/ArcherProfilePage';
import CanonicalArcherProfilePage from './pages/CanonicalArcherProfilePage';
import AdminCanonicalProfilesPage from './pages/AdminCanonicalProfilesPage';

const THEME_STORAGE_KEY = 'qlt-theme';

const THEME_OPTIONS = [
  { value: 'range-materials', label: 'Target Materials' },
  { value: 'steel-target-red', label: 'Steel & Target Red' },
  { value: 'smoked-woodland', label: 'Smoked Woodland' },
  { value: 'architectural-range', label: 'Architectural Range' },
  { value: 'range-bronze', label: 'Range Bronze' },
  { value: 'parchment-scorecard', label: 'Parchment Scorecard' },
  // { value: 'steel-target-red-light', label: 'Steel & Target Red Light' },
  // { value: 'night-range', label: 'Night Range Cyan-Orange' }
] as const;

const DEFAULT_THEME = 'range-materials';

export default function App(): JSX.Element {
  const queryClient = useQueryClient();
  const sessionQuery = useAdminSession();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME;
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME;
  });
  const logoutMutation = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'session'] });
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
              <Link to="/admin">Admin</Link>
              <div className="theme-menu">
                <button
                  type="button"
                  className="nav-button theme-icon-button"
                  onClick={() => setIsThemeMenuOpen((value) => !value)}
                  aria-expanded={isThemeMenuOpen}
                  aria-label="Open theme menu"
                  title="Theme"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3.25c-4.83 0-8.75 3.6-8.75 8.04 0 2.17.96 4.16 2.68 5.63 1.06.91 2.37 1.48 3.77 1.67.82.11 1.3.63 1.3 1.29 0 1.07.85 1.87 1.94 1.87h.87c4.72 0 8.44-3.38 8.44-7.98 0-5.86-4.58-10.52-10.25-10.52Zm1.8 16.5h-.86c-.2 0-.32-.1-.32-.25 0-1.44-1.06-2.63-2.71-2.86-1.1-.15-2.1-.6-2.9-1.29-1.14-.98-1.76-2.29-1.76-3.8 0-3.55 3.07-6.42 6.75-6.42 4.75 0 8.25 3.84 8.25 8.52 0 3.7-2.93 6.1-6.45 6.1Zm-6.55-8.6a1.15 1.15 0 1 1 2.3 0 1.15 1.15 0 0 1-2.3 0Zm3.2-3.1a1.05 1.05 0 1 1 2.1 0 1.05 1.05 0 0 1-2.1 0Zm3.5 2.45a1.1 1.1 0 1 1 2.2 0 1.1 1.1 0 0 1-2.2 0Zm-1.1 4.1a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0Z" />
                  </svg>
                </button>
                {isThemeMenuOpen ? (
                  <div className="theme-menu-panel">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`theme-menu-item ${theme === option.value ? 'is-active' : ''}`}
                        onClick={() => {
                          setTheme(option.value);
                          setIsThemeMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {sessionQuery.data?.authenticated ? (
                <button
                  type="button"
                  className="nav-button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? 'Signing out…' : 'Logout'}
                </button>
              ) : null}
            </div>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<RequireAdminAuth />}>
            <Route path="/admin" element={<AdminHomePage />} />
            <Route path="/admin/tournaments" element={<AdminTournamentsPage />} />
            <Route path="/admin/canonical-profiles" element={<AdminCanonicalProfilesPage />} />
          </Route>
          <Route path="/tournaments/:tournamentId" element={<TournamentDashboardPage />} />
          <Route
            path="/tournaments/:tournamentId/categories"
            element={<TournamentDashboardPage />}
          />
          <Route
            path="/tournaments/:tournamentId/categories/:categorySlug"
            element={<TournamentCategoryPage />}
          />
          <Route
            path="/tournaments/:tournamentId/categories/:categorySlug/archers/:archerId"
            element={<ArcherProfilePage />}
          />
          <Route
            path="/tournaments/:tournamentId/categories/:categorySlug/events/:eventId"
            element={<EventCategoryDetailPage />}
          />
          <Route path="/events/:eventId" element={<EventLeaderboardPage />} />
          <Route path="/archers/:archerId" element={<ArcherProfilePage />} />
          <Route path="/profiles/:canonicalArcherId" element={<CanonicalArcherProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>
        Crafted for The Quiver Archery League • Data updates via BetweenEnds Tracker
      </footer>
    </div>
  );
}
