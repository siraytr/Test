import React from 'react';
import i18n from '../i18n/de';
import axios from 'axios';

export default function Login() {
  const [username, setUser] = React.useState('');
  const [password, setPass] = React.useState('');
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await axios.post('/api/login', { username, password });
      window.location.hash = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl mb-4">{i18n.loginTitle}</h1>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="block mb-2">
          <div className="text-sm">{i18n.username}</div>
          <input autoFocus value={username} onChange={e=>setUser(e.target.value)} className="mt-1 w-full p-2 rounded-md border" />
        </label>
        <label className="block mb-4">
          <div className="text-sm">{i18n.password}</div>
          <input type="password" value={password} onChange={e=>setPass(e.target.value)} className="mt-1 w-full p-2 rounded-md border" />
        </label>
        <button disabled={loading} className="w-full py-2 rounded-lg bg-gray-900 text-white">
          {loading ? 'Lädt...' : i18n.loginButton}
        </button>
        <div className="mt-4 text-sm text-gray-500">
          <button type="button" onClick={()=> window.location.hash='/suggest'} className="underline">{i18n.suggestUser}</button>
        </div>
      </form>
    </div>
  );
}
