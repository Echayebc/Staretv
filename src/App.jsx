import { useState, useRef } from 'react'
import Hls from 'hls.js'

const MY_PROXY = "https://api.allorigins.win/raw?url="

export default function App() {
  const [host, setHost] = useState('http://kdfgh.com')
  const [user, setUser] = useState('kwpnjanu')
  const [pass, setPass] = useState('qpzgktes')
  const [channels, setChannels] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('')
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  const connect = async (useProxy) => {
    if(!host || !user || !pass){ setError('عمر 3 خانات'); return }
    setLoading(true); setError(''); setMode(useProxy ? 'بروكسي' : 'مباشر')
    let h = host.trim()
    if(!h.startsWith('http')) h = 'http://' + h
    h = h.replace(/\/$/, '')

    const apiUrl = `${h}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`
    
    try {
      let data
      if(useProxy){
        const res = await fetch(`${MY_PROXY}${encodeURIComponent(apiUrl)}`)
        const text = await res.text()
        data = JSON.parse(text)
      } else {
        // اتصال مباشر
        const res = await fetch(apiUrl)
        data = await res.json()
      }

      if(!Array.isArray(data) || data.length===0){ setError('معلومات غالطة أو ماكانش قنوات'); setLoading(false); return }
      setChannels(data)
      play(data[0], h, useProxy)
    } catch(e){
      if(useProxy) setError('البروكسي فشل - جرب المباشر أو بدل https')
      else setError('المباشر فشل بسبب الحماية - جرب البروكسي')
    }
    setLoading(false)
  }

  const play = (ch, h, useProxy) => {
    setCurrent(ch)
    let server = h || host.trim()
    if(!server.startsWith('http')) server = 'http://' + server
    server = server.replace(/\/$/, '')
    
    const rawUrl = `${server}/live/${user}/${pass}/${ch.stream_id}.m3u8`
    const finalUrl = useProxy ? `https://corsproxy.io/?${encodeURIComponent(rawUrl)}` : rawUrl

    const video = videoRef.current
    if(Hls.isSupported()){
      if(hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(finalUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, ()=> video.play().catch(()=>{}))
    } else {
      video.src = finalUrl
      video.play().catch(()=>{})
    }
  }

  return (
    <div style={{background:'#000', color:'#fff', minHeight:'100vh'}}>
      <video ref={videoRef} controls style={{width:'100%', aspectRatio:'16/9', background:'#111'}} />

      {current && <div style={{textAlign:'center', padding:'22px', fontSize:'40px', fontWeight:'900', color:'#ffcc00'}}>▶️ {current.name}</div>}
      {error && <div style={{background:'#cc0000', padding:'22px', textAlign:'center', fontSize:'34px', fontWeight:'900'}}>{error}</div>}
      {mode && <div style={{background:'#222', padding:'12px', textAlign:'center', fontSize:'28px', fontWeight:'900'}}>الوضع: {mode}</div>}

      <div style={{padding:'20px'}}>
        <div style={{background:'#111', padding:'24px', borderRadius:'24px', marginBottom:'20px'}}>
          <div style={{fontSize:'32px', fontWeight:'900', marginBottom:'10px'}}>السرفر:</div>
          <input value={host} onChange={e=>setHost(e.target.value)} style={{width:'100%', padding:'28px', borderRadius:'16px', border:'none', background:'#222', color:'#fff', fontSize:'34px', marginBottom:'18px', boxSizing:'border-box', fontWeight:'700'}} />

          <div style={{fontSize:'32px', fontWeight:'900', marginBottom:'10px'}}>المستخدم:</div>
          <input value={user} onChange={e=>setUser(e.target.value)} style={{width:'100%', padding:'28px', borderRadius:'16px', border:'none', background:'#222', color:'#fff', fontSize:'34px', marginBottom:'18px', boxSizing:'border-box', fontWeight:'700'}} />

          <div style={{fontSize:'32px', fontWeight:'900', marginBottom:'10px'}}>كلمة المرور:</div>
          <input value={pass} onChange={e=>setPass(e.target.value)} style={{width:'100%', padding:'28px', borderRadius:'16px', border:'none', background:'#222', color:'#fff', fontSize:'34px', marginBottom:'24px', boxSizing:'border-box', fontWeight:'700'}} />

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
            <button onClick={()=>connect(false)} style={{padding:'30px', borderRadius:'18px', border:'none', background:'#00e676', color:'#000', fontSize:'36px', fontWeight:'900'}}>
              {loading && mode==='مباشر' ? '⏳...' : '🔌 مباشر'}
            </button>
            <button onClick={()=>connect(true)} style={{padding:'30px', borderRadius:'18px', border:'none', background:'#ffcc00', color:'#000', fontSize:'36px', fontWeight:'900'}}>
              {loading && mode==='بروكسي' ? '⏳...' : '🌐 بروكسي'}
            </button>
          </div>
        </div>

        <div style={{display:'grid', gap:'14px'}}>
          {channels.map(ch => (
            <div key={ch.stream_id} onClick={()=>play(ch, host, mode==='بروكسي')} style={{padding:'28px', background: current?.stream_id===ch.stream_id ? '#ffcc00':'#1e1e1e', color: current?.stream_id===ch.stream_id ? '#000':'#fff', borderRadius:'16px', fontSize:'36px', fontWeight:'900'}}>
              ▶️ {ch.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
