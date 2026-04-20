'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Place = { id: string; name: string; address: string; rating: number; types: string[] }

export default function Nearby() {
  const router = useRouter()
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`/api/places?lat=${coords.latitude}&lng=${coords.longitude}`)
          const data = await res.json()
          setPlaces(data.places || [])
        } catch {
          setError('搵唔到附近地點')
        }
        setLoading(false)
      },
      () => { setError('請允許位置權限'); setLoading(false) }
    )
  }, [])

  const selectPlace = (p: Place) => {
    const id   = `proj_${Date.now()}`
    const proj = { id, user_id:'local', name:p.name, address:p.address, duration:60, script:[], status:'draft', created_at:new Date().toISOString(), updated_at:new Date().toISOString() }
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs = JSON.parse(raw)
      localStorage.setItem('soon-projects', JSON.stringify([proj, ...projs]))
    } catch {}
    router.push(`/project/${id}/create`)
  }

  const typeLabel = (types: string[]) => {
    if (types.includes('restaurant')) return '餐廳'
    if (types.includes('cafe'))       return '咖啡店'
    if (types.includes('tourist_attraction')) return '景點'
    return '地點'
  }

  return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'var(--ink3)', cursor:'pointer', fontSize:13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize:18 }}>附近題材</span>
        <div style={{ width:40 }} />
      </div>

      <div style={{ flex:1, padding:'20px 20px 40px', maxWidth:480, width:'100%', margin:'0 auto' }}>
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, paddingTop:60 }}>
            <div style={{ width:28, height:28, border:'2px solid var(--border2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <p style={{ color:'var(--ink3)', fontSize:13 }}>搵緊附近地點…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {error && <div style={{ fontSize:13, color:'var(--ink3)', textAlign:'center', paddingTop:60 }}>{error}</div>}
        {!loading && !error && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <p style={{ fontSize:13, color:'var(--ink3)', marginBottom:8 }}>附近 {places.length} 個地點，點選即可開始新 Project</p>
            {places.map(p => (
              <button key={p.id} onClick={() => selectPlace(p)} style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'14px 16px', textAlign:'left', cursor:'pointer', transition:'border-color 0.15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:14, fontWeight:500, color:'var(--ink)' }}>{p.name}</span>
                  <span style={{ fontSize:11, color:'var(--ink3)', background:'var(--bg3)', padding:'2px 8px', borderRadius:'var(--pill)' }}>{typeLabel(p.types)}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--ink3)' }}>{p.address}</div>
                {p.rating && <div style={{ fontSize:11, color:'var(--accent2)', marginTop:4 }}>★ {p.rating}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
