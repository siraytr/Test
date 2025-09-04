import React from 'react';

export default function AlbumCard({ album }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="p-4">
        <h2 className="text-lg font-semibold">{album.title}</h2>
        <div className="text-sm text-gray-500">{album.count} Medien • {(album.size/1024/1024).toFixed(1)} MB</div>
        <div className="mt-4">
          <button onClick={()=> window.location.hash=`/album/${encodeURIComponent(album.title)}`} className="px-3 py-2 rounded bg-gray-900 text-white">Öffnen</button>
        </div>
      </div>
    </div>
  );
}
