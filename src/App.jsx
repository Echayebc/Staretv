import { useState, useRef } from 'react'
import Hls from 'hls.js'

const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.name/fetch/${url}`,
  url => `https://cors-anywhere.herokuapp.com/${url}`,
  url => `https://proxy.cors.sh/${url}`
]

export default function App() {
  const [host, setHost] = useState('')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [channels, setChannels] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [proxyIndex, setProxyIndex] = useState(0)
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  const fetchWithProxies = async (url) => {
    for(let i=0; i<PROXIES.length; i++){
      const idx = (proxyIndex + i) % PROXIES.length
      try{
        const proxyUrl = PROXIES[idx](url)
        const res = await fetch(proxyUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        if(res.ok){
          const text = await res.text()
          try{ 
            const json = JSON.parse(text)
            setProxyIndex(idx)
            return json
          }catch{}
        }
      }catch(e){}
    }
    throw new Error('كل البروكسيات طاحو')
  }

  const connect = async () => {
    if(!host || !user || !pass){ setError('عمر الخانات'); return }
    setLoading(true); setError('')
    let h = host.trim()
    if(!h.startsWith('http')) h = 'http://' + h
    h = h.replace(/\/$/, '')
    try {
      const apiUrl = `${h}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`
      const data = await fetchWithProxies(apiUrl)
      setChannels(Array.isArray(data) ? data : [])
      if(data.length>0) play(data[0], h)
      if(data.length===0) setError('ماكانش قنوات')
    } catch(e){ setError('كل البروكسيات فشلت - جرب https للسرفر') }
    setLoading(false)
  }

  const play = (ch, h) => {
    setCurrent(ch)
    let server = h || host.trim()
    if(!server.startsWith('http')) server = 'http://' + server
    server = server.replace(/\/$/, '')
    // بروكسي للفيديو ايضا
    const rawUrl = `${server}/live/${user}/${pass}/${ch.stream_id}.m3u8`
    const proxiedVideo = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`
    
    const video = videoRef.current
    if(Hls.isSupported()){
      if(hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls()
      hlsRef.current = hls
      // جرب بلا بروكسي أولا، اذا فشل بالبروكسي
      hls.loadSource(rawUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (event, data) => {
        if(data.fatal){
          hls.loadSource(proxiedVideo)
        }
      })
      hls.on(Hls.Events.MANIFEST_PARSED, ()=> video.play().catch(()=>{}))
    } else {
      video.src = rawUrl
      video.play().catch(()=>{})
    }
  }

  return (
    <div style={{background:'#000', color:'#fff', minHeight:'100vh'}}>
      <video ref={videoRef} controls style={{width:'100%', aspectRatio:'16/9', background:'#000'}} />
      {current && <div style={{textAlign:'center', padding:'16px', fontSize:'30px', fontWeight:'900', color:'#ffcc00'}}>▶️ {current.name}</div>}
      {error && <div style={{background:'#cc0000', padding:'14px', textAlign:'center', fontSize:'26px', fontWeight:'900'}}>{error}</div>}
      <div style={{padding:'16px'}}>
        <input value={host} onChange={e=>setHost(e.target.value)} placeholder="Host" style={{width:'100%', padding:'22px', borderRadius:'14px', border:'none', background:'#222', color:'#fff', fontSize:'26px', marginBottom:'12px', boxSizing:'border-box'}} />
        <input value={user} onChange={e=>setUser(e.target.value)} placeholder="User" style={{width:'100%', padding:'22px', borderRadius:'14px', border:'none', background:'#222', color:'#fff', fontSize:'26px', marginBottom:'12px', boxSizing:'border-box'}} />
        <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Pass" style={{width:'100%', padding:'22px', borderRadius:'14px', border:'none', background:'#222', color:'#fff', fontSize:'26px', marginBottom:'16px', boxSizing:'border-box'}} />
        <button onClick={connect} style={{width:'100%', padding:'24px', borderRadius:'14px', border:'none', background:'#ffcc00', color:'#000', fontSize:'32px', fontWeight:'900'}}>{loading ? '⏳' : `🔌 اتصال (بروكسي ${proxyIndex+1}/${PROXIES.length})`}</button>
        <div style={{marginTop:'16px', display:'grid', gap:'10px'}}>
          {channels.map(ch => (
            <div key={ch.stream_id} onClick={()=>play(ch)} style={{padding:'20px', background: current?.stream_id===ch.stream_id ? '#ffcc00':'#1a1a1a', color: current?.stream_id===ch.stream_id ? '#000':'#fff', borderRadius:'12px', fontSize:'28px', fontWeight:'900'}}>{ch.name}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
