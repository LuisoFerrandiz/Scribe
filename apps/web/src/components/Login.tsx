import { useState } from 'react';
import { api, serverError } from '../api';
import type { SessionUser } from '../types';

export function Login({ onLogin }: { onLogin: (u: SessionUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api.login(username, password));
    } catch (err) {
      setError(serverError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>Scribe Helper</h1>
      <label>
        User
        <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy || !username || !password}>
        Sign in
      </button>
    </form>
  );
}
