import React from 'react';

export default function MediaGrid({ items }) {
  if (!items || items.length===0) return <div>Keine Medien</div>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map(it => (
        <div key={it.filename} className="bg-gray-50 dark:bg-gray-900 rounded overflow-hidden shadow-sm">
          <img src={it.thumb} alt={it.filename} loading="lazy" className="w-full h-48 object-cover" />
          <div className="p-2 text-sm">{it.filename}</div>
        </div>
      ))}
    </div>
  );
}
