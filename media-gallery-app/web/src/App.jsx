import React from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Album from './pages/Album';

function App() {
  // very naive routing based on location.hash for demo
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const onHash = () => setTick(t => t+1);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const route = window.location.hash.replace('#','') || '/';
  // simple auth check by ping /health or /api/albums could be done; here we show login by route
  if (route.startsWith('/album/')) {
    const name = decodeURIComponent(route.replace('/album/',''));
    return <Album albumName={name} />
  }
  if (route === '/dashboard' || route === '/') return <Dashboard />;
  return <Login />;
}

export default App;
