import React, {useState} from 'react'

function Login({onLogin}) {
  const [u,setU]=useState('Moritz'), [p,setP]=useState('');
  async function submit(e){ e.preventDefault();
    const res = await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'}, body: JSON.stringify({username:u,password:p})});
    if(res.ok) onLogin();
    else {
      const data = await res.json().catch(()=>null);
      alert('login failed: ' + (data && data.error ? data.error : 'unknown'));
    }
  }
  return <form onSubmit={submit} className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg">
    <h1 className="text-2xl font-semibold mb-4">Login</h1>
    <input value={u} onChange={e=>setU(e.target.value)} className="border p-2 w-full mb-2 rounded" />
    <input type="password" value={p} onChange={e=>setP(e.target.value)} className="border p-2 w-full mb-4 rounded" />
    <button className="px-4 py-2 rounded bg-gray-900 text-white">Sign in</button>
  </form>
}

function Gallery() {
  const [collections,setCollections]=React.useState([]);
  React.useEffect(()=>{ fetch('/api/scan').then(r=>r.json()).then(d=>setCollections(d.collections||[])).catch(()=>{}) },[]);
  return <div className="p-6 space-y-6">
    {collections.map(c=>(
      <section key={c.name}>
        <h2 className="text-xl font-medium mb-3">{c.name}</h2>
        <div className="grid grid-cols-4 gap-3">
          {c.items.map((it,idx)=>(
            <div key={idx} className="rounded overflow-hidden shadow-sm bg-white">
              <img src={it.thumb} alt="" className="w-full h-40 object-cover" />
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
}

export default function App(){
  const [auth, setAuth] = useState(false);
  if(!auth) return <Login onLogin={()=>setAuth(true)} />
  return <div className="min-h-screen bg-gray-50">
    <header className="p-4 bg-white shadow sticky top-0">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="text-lg font-semibold">USB Gallery — Moritz</div>
        <div/>
      </div>
    </header>
    <main className="max-w-5xl mx-auto"><Gallery/></main>
  </div>
}
