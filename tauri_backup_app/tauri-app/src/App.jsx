import React, {useState} from 'react'
import axios from 'axios'

export default function App(){
  const [step,setStep]=useState('login')
  return (
    <div className="min-h-screen bg-surface p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white/60 backdrop-blur rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-semibold mb-4">Tauri Backup — Minimal</h1>
        {step==='login' && <Login onSignup={()=>setStep('signup')} onLogin={()=>setStep('upload')}/>}
        {step==='signup' && <Signup onBack={()=>setStep('login')}/>}
        {step==='upload' && <Upload/>}
      </div>
    </div>
  )
}

function Login({onSignup,onLogin}){
  return (<div>
    <p>Login (stub)</p>
    <button onClick={onLogin} className="btn">Continue</button>
    <button onClick={onSignup} className="btn-ghost">Signup</button>
  </div>)
}
function Signup({onBack}){
  return (<div>
    <p>Request signup (stub)</p>
    <button onClick={onBack} className="btn">Back</button>
  </div>)
}
function Upload(){
  const [file,setFile]=useState(null)
  async function start(){
    if(!file) return
    // init
    const init = await axios.post('/api/upload/init',{filename:file.name,size:file.size})
    const id = init.data.upload_id
    const chunkSize = init.data.chunk_size
    const total = Math.ceil(file.size / chunkSize)
    for(let i=0;i<total;i++){
      const start = i*chunkSize
      const end = Math.min(file.size,(i+1)*chunkSize)
      const blob = file.slice(start,end)
      await axios.post(`/api/upload/${id}/chunk?index=${i}`, blob, {headers: {'Content-Type':'application/octet-stream'}})
    }
    await axios.post(`/api/upload/${id}/complete`, {total_chunks: total})
    alert('Upload complete (server must exist)')
  }
  return (<div>
    <input type="file" onChange={e=>setFile(e.target.files[0])}/>
    <button onClick={start} className="btn">Upload</button>
  </div>)
}
