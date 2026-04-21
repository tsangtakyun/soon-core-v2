'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Place = {
  id: string; name: string; address: string; rating: number
  types: string[]; category: string; typeLabel: string
  photo?: string; filmScore?: number; filmReason?: string
}

export default function Nearby() {
  const router = useRouter()
  const [places, setPlaces]   = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null)

  const fetchPlaces = async (lat: number, lng: number) => {
    setLoading(true); setError(''); setPlaces([])
    try {
      const res  = await fetch(`/api/places?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setPlaces(data.places || [])
    } catch { setError('搵唔到附近地點，請稍後再試') }
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const c = { lat: coords.latitude, lng: coords.longitude }
        setCoords(c); fetchPlaces(c.lat, c.lng)
      },
      () => { setError('請允許位置權限'); setLoading(false) },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [])

  const selectPlace = (p: Place) => {
    const projId = `proj_${Date.now()}`
    const proj   = { id: projId, user_id: 'local', name: p.name, address: p.address, duration: 60, script: [], status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    try {
      const raw = localStorage.getItem('soon-projects') || '[]'
      localStorage.setItem('soon-projects', JSON.stringify([proj, ...JSON.parse(raw)]))
    } catch {}
    router.push(`/project/${projId}/create?category=${p.category}`)
  }

  const scoreColor = (s?: number) => {
    if (!s) return 'var(--ink3)'
    if (s >= 80) return '#1DB954'
    if (s >= 65) return '#FAC775'
    return 'var(--ink3)'
  }

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>附近有咩拍</span>
        {!loading && coords
          ? <button onClick={() => fetchPlaces(coords.lat, coords.lng)} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontSize: 13 }}>重新整理</button>
          : <div style={{ width: 60 }} />}
      </div>

      <div style={{ flex: 1, padding: '16px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 80 }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--ink3)', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
              搵緊附近題材<br/>
              <span style={{ fontSize: 11 }}>AI 評估緊可拍性…</span>
            </p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && error && (
          <div style={{ paddingTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.7, marginBottom: 20 }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '12px 24px', fontSize: 13, color: '#fff', cursor: 'pointer' }}>重試</button>
          </div>
        )}

        {!loading && !error && places.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6 }}>
              按 AI 可拍性排序 · {places.length} 個地點 · 5公里內
            </p>
            {places.map((p, i) => (
              <button key={p.id} onClick={() => selectPlace(p)} style={{ width: '100%', background: 'var(--bg2)', border: `1px solid ${i === 0 ? 'rgba(29,185,84,0.4)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: 0, textAlign: 'left', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                {p.photo && (
                  <div style={{ width: '100%', height: 110, overflow: 'hidden', background: 'var(--bg3)' }}>
                    <img src={`/api/places/photo?ref=${p.photo}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
                  </div>
                )}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{p.name}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--accent2)', background: 'rgba(77,107,254,0.12)', padding: '2px 8px', borderRadius: 'var(--pill)' }}>{p.typeLabel}</span>
                      {p.filmScore && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(p.filmScore) }}>
                          可拍性 {p.filmScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6 }}>{p.address}</div>
                  {/* AI reason */}
                  {p.filmReason && (
                    <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5, borderLeft: '2px solid var(--border2)', paddingLeft: 8 }}>
                      {p.filmReason}
                    </div>
                  )}
                  {p.rating > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>★ {p.rating.toFixed(1)} Google</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && places.length === 0 && (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>附近搵唔到地點，試試移動位置後重試</div>
        )}
      </div>
    </main>
  )
}
