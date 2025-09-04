import React from 'react';
import axios from 'axios';
import MediaGrid from '../components/MediaGrid';

export default function Album({ albumName }) {
  const [data, setData] = React.useState({items:[], total:0});
  React.useEffect(()=> {
    axios.get(`/api/album/${encodeURIComponent(albumName)}`).then(r=>setData(r.data)).catch(()=>setData({items:[], total:0}));
  }, [albumName]);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl">{albumName}</h1>
        <div>
          <button onClick={()=> window.location.hash='/dashboard'} className="px-3 py-2 rounded border">Zurück</button>
        </div>
      </div>
      <MediaGrid items={data.items} />
    </div>
  );
}
