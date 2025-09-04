import React from 'react';
import axios from 'axios';
import i18n from '../i18n/de';
import AlbumCard from '../components/AlbumCard';

export default function Dashboard() {
  const [albums, setAlbums] = React.useState([]);
  React.useEffect(()=> {
    axios.get('/api/albums').then(r=>setAlbums(r.data)).catch(()=>setAlbums([]));
  }, []);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">{i18n.dashboardTitle}</h1>
        <div>
          <button onClick={()=>{axios.post('/api/logout').then(()=>window.location.hash='/')}} className="px-3 py-1 rounded border">{i18n.logout}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {albums.map(a => <AlbumCard key={a.title} album={a} />)}
      </div>
    </div>
  );
}
