import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../api/client';
import { useAdminSession } from '../hooks/useAdminSession';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export default function AdminLoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const sessionQuery = useAdminSession();
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: (nextPassword: string) => loginAdmin(nextPassword),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'session'] });
      const from = (location.state as LocationState | null)?.from?.pathname ?? '/admin';
      navigate(from, { replace: true });
    }
  });

  useEffect(() => {
    if (loginMutation.isSuccess) {
      setPassword('');
    }
  }, [loginMutation.isSuccess]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    loginMutation.mutate(password);
  };

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

  if (sessionQuery.data?.authenticated) {
    const from = (location.state as LocationState | null)?.from?.pathname ?? '/admin';
    return <Navigate to={from} replace />;
  }

  return (
    <section className="admin-login-shell">
      <div className="card admin-login-card">
        <h1>Admin Login</h1>
        <p className="text-muted">
          Sign in to access tournament operations and canonical profile repair tools.
        </p>

        {!sessionQuery.data?.configured ? (
          <p className="text-muted">
            Admin authentication is not configured. Set `ADMIN_PASSWORD` and
            `ADMIN_SESSION_SECRET` in the API environment.
          </p>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              className="button"
              disabled={loginMutation.isPending || password.trim().length === 0}
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {sessionQuery.isError ? (
          <p className="text-muted">Error: {(sessionQuery.error as Error).message}</p>
        ) : null}
        {loginMutation.isError ? (
          <p className="text-muted">Error: {(loginMutation.error as Error).message}</p>
        ) : null}

        <p className="text-muted">
          <Link to="/">Return to tournaments</Link>
        </p>
      </div>
    </section>
  );
}
