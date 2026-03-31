import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminSession } from '../hooks/useAdminSession';

export default function RequireAdminAuth(): JSX.Element {
  const location = useLocation();
  const sessionQuery = useAdminSession();

  if (sessionQuery.isLoading) {
    return (
      <section className="admin-login-shell">
        <div className="card admin-login-card">
          <h1>Admin Login</h1>
          <p className="text-muted">Checking admin session…</p>
        </div>
      </section>
    );
  }

  if (sessionQuery.isError) {
    return (
      <section className="admin-login-shell">
        <div className="card admin-login-card">
          <h1>Admin Login</h1>
          <p className="text-muted">Error: {(sessionQuery.error as Error).message}</p>
        </div>
      </section>
    );
  }

  if (!sessionQuery.data?.configured) {
    return (
      <section className="admin-login-shell">
        <div className="card admin-login-card">
          <h1>Admin Login</h1>
          <p className="text-muted">
            Admin authentication is not configured. Set `ADMIN_PASSWORD` and
            `ADMIN_SESSION_SECRET` in the API environment before using the admin space.
          </p>
        </div>
      </section>
    );
  }

  if (!sessionQuery.data.authenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
