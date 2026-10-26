import { useCallback, useEffect, useState } from 'react';
import { ApiError, AuthError, api } from './api';
import type { SessionUser } from './types';
import { Login } from './components/Login';
import { CaseList } from './components/CaseList';
import { NewCase } from './components/NewCase';
import { CaseView } from './components/CaseView';

// Hash routes: "#/" list, "#/new" new case, "#/case/12" document.
type Route = { name: 'list' } | { name: 'new' } | { name: 'case'; id: number };

function parseRoute(hash: string): Route {
  if (hash === '#/new') return { name: 'new' };
  const m = /^#\/case\/(\d+)$/.exec(hash);
  if (m) return { name: 'case', id: Number(m[1]) };
  return { name: 'list' };
}

// The last logged-in user, so the app still opens (and the case from its local copy) with the
// server unreachable. The session cookie is still checked by every request that reaches it.
const USER_KEY = 'scribe.user';
function readUser(): SessionUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as SessionUser | null;
  } catch {
    return null;
  }
}
function writeUser(u: SessionUser | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable: the app works without it */
  }
}

export function go(hash: string) {
  window.location.hash = hash;
}

export function App() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined); // undefined = checking
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        writeUser(u);
        setUser(u);
      })
      // Server unreachable (not a refusal): keep going as the last user instead of asking for a login.
      .catch((e) => setUser(e instanceof ApiError || e instanceof AuthError ? null : readUser()));
  }, []);

  const onAuthLost = useCallback(() => {
    writeUser(null);
    setUser(null);
  }, []);

  if (user === undefined) return <div className="center muted">Loading…</div>;
  if (user === null) return <Login
      onLogin={(u) => {
        writeUser(u);
        setUser(u);
      }}
    />;

  return (
    <div className="app">
      {route.name === 'list' && (
        <CaseList
          user={user}
          onAuthLost={onAuthLost}
          onLogout={() => api.logout().finally(onAuthLost)}
        />
      )}
      {route.name === 'new' && <NewCase onAuthLost={onAuthLost} />}
      {route.name === 'case' && <CaseView key={route.id} caseId={route.id} onAuthLost={onAuthLost} />}
    </div>
  );
}
