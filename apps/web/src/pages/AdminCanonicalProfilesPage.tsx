import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCanonicalInspection,
  fetchSuspiciousCanonicalProfiles,
  linkCanonicalArcher,
  unlinkCanonicalArcher
} from '../api/client';

export default function AdminCanonicalProfilesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedCanonicalId, setSelectedCanonicalId] = useState<number | null>(null);
  const [inspectInput, setInspectInput] = useState('');
  const [linkArcherId, setLinkArcherId] = useState('');
  const [linkCanonicalId, setLinkCanonicalId] = useState('');
  const [unlinkArcherId, setUnlinkArcherId] = useState('');
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const suspiciousQuery = useQuery({
    queryKey: ['admin', 'canonical-suspicious'],
    queryFn: fetchSuspiciousCanonicalProfiles,
    staleTime: 60_000
  });

  useEffect(() => {
    if (!selectedCanonicalId && suspiciousQuery.data && suspiciousQuery.data.length > 0) {
      const firstId = suspiciousQuery.data[0].canonicalArcherId;
      setSelectedCanonicalId(firstId);
      setInspectInput(String(firstId));
    }
  }, [selectedCanonicalId, suspiciousQuery.data]);

  const inspectionQuery = useQuery({
    queryKey: ['admin', 'canonical-inspection', selectedCanonicalId],
    queryFn: () => fetchCanonicalInspection(selectedCanonicalId as number),
    enabled: selectedCanonicalId !== null
  });

  const invalidateAdminQueries = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'canonical-suspicious'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'canonical-inspection'] }),
      queryClient.invalidateQueries({ queryKey: ['canonicalArcherProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['archerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['tournamentLeaderboard'] }),
      queryClient.invalidateQueries({ queryKey: ['eventLeaderboard'] })
    ]);
  };

  const linkMutation = useMutation({
    mutationFn: ({ archerId, canonicalArcherId }: { archerId: number; canonicalArcherId: number }) =>
      linkCanonicalArcher(archerId, canonicalArcherId),
    onSuccess: async (result) => {
      setFlashMessage(`Linked archer ${result.archerId} to canonical ${result.canonicalArcherId}.`);
      setSelectedCanonicalId(result.canonicalArcherId);
      setInspectInput(String(result.canonicalArcherId));
      setLinkArcherId('');
      setLinkCanonicalId('');
      await invalidateAdminQueries();
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: (archerId: number) => unlinkCanonicalArcher(archerId),
    onSuccess: async (result) => {
      setFlashMessage(
        result.detached
          ? `Detached archer ${result.archerId} from canonical ${result.previousCanonicalArcherId}.`
          : `Archer ${result.archerId} was not linked to a canonical profile.`
      );
      setUnlinkArcherId('');
      await invalidateAdminQueries();
    }
  });

  const handleInspectSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = Number.parseInt(inspectInput, 10);
    if (!Number.isNaN(parsed)) {
      setSelectedCanonicalId(parsed);
      setFlashMessage(null);
    }
  };

  const handleLinkSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const archerId = Number.parseInt(linkArcherId, 10);
    const canonicalArcherId = Number.parseInt(linkCanonicalId, 10);
    if (!Number.isNaN(archerId) && !Number.isNaN(canonicalArcherId)) {
      linkMutation.mutate({ archerId, canonicalArcherId });
    }
  };

  const handleUnlinkSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const archerId = Number.parseInt(unlinkArcherId, 10);
    if (!Number.isNaN(archerId)) {
      unlinkMutation.mutate(archerId);
    }
  };

  return (
    <section>
      <h1>Canonical Admin</h1>
      <p className="text-muted">
        Review suspicious canonical profiles, inspect linked archer records, and manually repair bad links.
      </p>

      {flashMessage && <p className="admin-flash">{flashMessage}</p>}

      <div className="admin-grid">
        <section className="card">
          <h2>Suspicious Profiles</h2>
          {suspiciousQuery.isLoading ? (
            <p className="text-muted">Scanning canonical profiles…</p>
          ) : suspiciousQuery.isError ? (
            <p className="text-muted">Error: {(suspiciousQuery.error as Error).message}</p>
          ) : !suspiciousQuery.data || suspiciousQuery.data.length === 0 ? (
            <p className="text-muted">No suspicious profiles found.</p>
          ) : (
            <ul className="link-list">
              {suspiciousQuery.data.map((profile) => (
                <li key={profile.canonicalArcherId}>
                  <button
                    type="button"
                    className={`admin-list-button ${
                      selectedCanonicalId === profile.canonicalArcherId ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      setSelectedCanonicalId(profile.canonicalArcherId);
                      setInspectInput(String(profile.canonicalArcherId));
                      setFlashMessage(null);
                    }}
                  >
                    <strong>
                      #{profile.canonicalArcherId} {profile.displayName}
                    </strong>
                    <span className="text-muted">
                      {profile.linkedArchers} linked · {profile.reasons.join('; ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Inspect Profile</h2>
          <form className="admin-form" onSubmit={handleInspectSubmit}>
            <label>
              <span>Canonical ID</span>
              <input
                value={inspectInput}
                onChange={(event) => setInspectInput(event.target.value)}
                placeholder="12"
                inputMode="numeric"
              />
            </label>
            <button type="submit" className="button">
              Inspect
            </button>
          </form>

          {inspectionQuery.isLoading ? (
            <p className="text-muted">Loading canonical profile…</p>
          ) : inspectionQuery.isError ? (
            <p className="text-muted">Error: {(inspectionQuery.error as Error).message}</p>
          ) : inspectionQuery.data ? (
            <>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-label">Normalized Key</div>
                  <div className="stat-value stat-value-small">
                    {inspectionQuery.data.canonicalArcher.normalizedKey}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Linked Archers</div>
                  <div className="stat-value">{inspectionQuery.data.canonicalArcher.linkedArchers}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Scores</div>
                  <div className="stat-value">{inspectionQuery.data.canonicalArcher.totalScores}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Tournaments</div>
                  <div className="stat-value">{inspectionQuery.data.canonicalArcher.tournamentsShot}</div>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Archer</th>
                      <th>Team</th>
                      <th>Condition</th>
                      <th>Events</th>
                      <th>Link Method</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionQuery.data.archers.map((archer) => (
                      <tr key={archer.id}>
                        <td>
                          #{archer.id} {archer.firstName} {archer.lastName}
                        </td>
                        <td>{archer.team ?? '—'}</td>
                        <td>{archer.conditionCode ?? '—'}</td>
                        <td>{archer.eventsShot}</td>
                        <td>{archer.canonicalLinkMethod ?? '—'}</td>
                        <td>{formatDateTime(archer.canonicalLinkUpdatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-muted">Select a suspicious profile or enter a canonical ID.</p>
          )}
        </section>
      </div>

      <div className="admin-grid">
        <section className="card">
          <h2>Manual Link</h2>
          <form className="admin-form" onSubmit={handleLinkSubmit}>
            <label>
              <span>Archer ID</span>
              <input
                value={linkArcherId}
                onChange={(event) => setLinkArcherId(event.target.value)}
                placeholder="297149"
                inputMode="numeric"
              />
            </label>
            <label>
              <span>Canonical ID</span>
              <input
                value={linkCanonicalId}
                onChange={(event) => setLinkCanonicalId(event.target.value)}
                placeholder="12"
                inputMode="numeric"
              />
            </label>
            <button type="submit" className="button" disabled={linkMutation.isPending}>
              {linkMutation.isPending ? 'Linking…' : 'Link Archer'}
            </button>
          </form>
          {linkMutation.isError && (
            <p className="text-muted">Error: {(linkMutation.error as Error).message}</p>
          )}
        </section>

        <section className="card">
          <h2>Manual Unlink</h2>
          <form className="admin-form" onSubmit={handleUnlinkSubmit}>
            <label>
              <span>Archer ID</span>
              <input
                value={unlinkArcherId}
                onChange={(event) => setUnlinkArcherId(event.target.value)}
                placeholder="297149"
                inputMode="numeric"
              />
            </label>
            <button type="submit" className="button" disabled={unlinkMutation.isPending}>
              {unlinkMutation.isPending ? 'Detaching…' : 'Detach Archer'}
            </button>
          </form>
          {unlinkMutation.isError && (
            <p className="text-muted">Error: {(unlinkMutation.error as Error).message}</p>
          )}
        </section>
      </div>
    </section>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}
