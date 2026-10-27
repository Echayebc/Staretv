import { useState, useRef } from 'react'
import Hls from 'hls.js'

export default function App() {
  const [host, setHost] = useState(localStorage.getItem('xt_host') || '')
  const [user, setUser] = useState(localStorage.getItem('xt_user') || '')
  const [pass, setPass] = useState(localStorage.getItem('xt_pass') || '')
  const [type, setType] = useState('live')
  const [cats, setCats] = useState([])
  const [streams, setStreams] = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [current, setCurrent] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  const fetchWithProxy = async (url) => {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ]
    for(let p of proxies){
      try{ const r = await fetch(p); if(r.ok){ const t = await r.text(); return JSON.parse(t) } }catch(e){}
    }
    throw new Error('proxy fail')
  }

  const api = async (action, extra='') => {
    let h = host.trim()
    if(!h.startsWith('http')) h = 'http://' + h
    h = h.replace(/\/$/, '')
    const url = `${h}/player_api.php?username=${user}&password=${pass}&action=${action}${extra}`
    return await fetchWithProxy(url)
  }

  const connect = async () => {
    if(!host || !user || !pass){ setError('عمر الخانات كامل'); return }
    setLoading(true); setError('')
    localStorage.setItem('xt_host', host)
    localStorage.setItem('xt_user', user)
    localStorage.setItem('xt_pass', pass)
    try {
      const c = await api(type === 'live' ? 'get_live_categories' : type === 'vod' ? 'get_vod_categories' : 'get_series_categories')
      setCats(Array.isArray(c) ? c : [])
      const s = await api(type === 'live' ? 'get_live_streams' : type === 'vod' ? 'get_vod_streams' : 'get_series')
      setStreams(Array.isArray(s) ? s : [])
      setActiveCat('all')
      if(s.length>0) play(s[0])
      if(s.length===0) setError('السيرفر فارغ - لا توجد قنوات')
    } catch(e){ setError('فشل الاتصال - السيرفر لا يرد أو محجوب، جرب Host ب https://') }
    setLoading(false)
  }

  const loadCat = async (catId) => {
    setActiveCat(catId); setLoading(true)
    try {
      const extra = catId === 'all' ? '' : `&category_id=${catId}`
      const s = await api(type === 'live' ? 'get_live_streams' : type === 'vod' ? 'get_vod_streams' : 'get_series', extra)
      setStreams(Array.isArray(s) ? s : [])
    } catch {}
    setLoading(false)
  }

  const play = (s) => {
    setCurrent(s)
    let h = host.trim()
    if(!h.startsWith('http')) h = 'http://' + h
    h = h.replace(/\/$/, '')
    let url = type === 'live' ? `${h}/live/${user}/${pass}/${s.stream_id}.m3u8` : type === 'vod' ? `${h}/movie/${user}/${pass}/${s.stream_id}.${s.container_extension}` : `${h}/series/${user}/${pass}/${s.stream_id}.mp4`
    const video = videoRef.current
    if(Hls.isSupported() && url.includes('.m3u8')){
      if(hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls(); hlsRef.current = hls
      hls.loadSource(url); hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, ()=> video.play().catch(()=>{}))
    } else { video.src = url; video.play().catch(()=>{}) }
  }

  const filtered = streams.filter(x => (x.name||x.title||'').toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{background:'#000', color:'#fff', minHeight:'100vh'}}>
      <div style={{background:'#000', position:'sticky', top:0, zIndex:10}}>
        <video ref={videoRef} controls playsInline style={{width:'100%', aspectRatio:'16/9', background:'#000'}} />
        {current && <div style={{padding:'22px', textAlign:'center', fontSize:'38px', fontWeight:'900', color:'#ffcc00'}}>{current.name || current.title}</div>}
        {error && <div style={{padding:'18px', background:'#cc0000', textAlign:'center', fontSize:'32px', fontWeight:'900'}}>{error}</div>}
      </div>
      <div style={{padding:'16px'}}>
        <div style={{background:'#111', padding:'18px', borderRadius:'18px', marginBottom:'16px'}}>
          <input value={host} onChange={e=>setHost(e.target.value)} placeholder="Host: http://server.com:8080" style={{width:'100%', padding:'26px', borderRadius:'14px', border:'none', background:'#222', color:'#fff', fontSize:'28px', marginBottom:'12px', boxSizing:'border-box'}} />
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="Username" style={{width:'100%', padding:'26px', borderRadius:'14px', border:'none', background:'#222', color:'#fff', fontSize:'28px', marginBottom:'12px', boxSizing:'border-box'}} />
          <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" type="password" style={{width:'100%', padding:'26px', borderRadius:'14px', border:'none', background:'#222', color:'#fff', fontSize:'28px', marginBottom:'12px', boxSizing:'border-box'}} />
          <button onClick={connect} style={{width:'100%', padding:'28px', borderRadius:'14px', border:'none', background:'#ffcc00', color:'#000', fontSize:'36px', fontWeight:'900'}}>🔌 اتصال Connect</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'16px'}}>
          <button onClick={()=>{setType('live'); setTimeout(connect,100)}} style={{padding:'26px', borderRadius:'14px', border:'none', background:type==='live'?'#ffcc00':'#222', color:type==='live'?'#000':'#fff', fontSize:'30px', fontWeight:'900'}}>📺 LIVE</button>
          <button onClick={()=>{setType('vod'); setTimeout(connect,100)}} style={{padding:'26px', borderRadius:'14px', border:'none', background:type==='vod'?'#ffcc00':'#222', color:type==='vod'?'#000':'#fff', fontSize:'30px', fontWeight:'900'}}>🎬 أفلام</button>
          <button onClick={()=>{setType('series'); setTimeout(connect,100)}} style={{padding:'26px', borderRadius:'14px', border:'none', background:type==='series'?'#ffcc00':'#222', color:type==='series'?'#000':'#fff', fontSize:'30px', fontWeight:'900'}}>📚 مسلسلات</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ابحث..." style={{width:'100%', padding:'26px', borderRadius:'14px', border:'none', background:'#1a1a1a', color:'#fff', fontSize:'32px', marginBottom:'16px', boxSizing:'border-box'}} />
        {loading && <div style={{textAlign:'center', fontSize:'40px', color:'#ffcc00', fontWeight:'900'}}>⏳ يحمل...</div>}
        <div style={{display:'grid', gap:'14px'}}>
          {filtered.slice(0,800).map((s,i)=>(<div key={i} onClick={()=>play(s)} style={{padding:'26px', background: current?.stream_id===s.stream_id ? '#ffcc00':'#141414', color: current?.stream_id===s.stream_id ? '#000':'#fff', borderRadius:'16px', fontSize:'34px', fontWeight:'900'}}>▶️ {s.name || s.title}</div>))}
        </div>
      </div>
    </div>
  )
}
