'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Place = {
  id: string
  name: string
  address: string
  rating: number
  types: string[]
  photo?: string
}

const TYPE_MAP: Record<string, { label: string; category: string }> = {
  restaurant:          { label: '餐廳',   category: 'food' },
  cafe:                { label: '咖啡店', category: 'food' },
  food:                { label: '食物',   category: 'food' },
  bakery:              { label: '烘焙',   category: 'food' },
  bar:                 { label: '酒吧',   category: 'food' },
  tourist_attraction:  { label: '景點',   category: 'attraction' },
  museum:              { label: '博物館', category: 'attraction' },
  park:                { label: '公園',   category: 'attraction' },
  art_gallery:         { label: '藝廊',   category: 'attraction' },
  spa:                 { label: '水療',   category: 'attraction' },
  store:               { label: '商店',   category: 'product' },
  shopping_mall:       { label: '商場',   category: 'product' },
  lodging:             { label: '住宿',   category: 'vlog' },
  night_club:          { label: '夜店',   category: 'vlog' },
}

function getTypeInfo(types: string[]): { label: string; category: string } {
  for (const t of types) {
    if (TYPE_MAP[t]) return TYPE_MAP[t]
  }
  return { label: '地點', category: 'attraction' }
}

export default function Nearby() {
  const router = useRouter()
  const [places, setPlaces]   = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setCoords({ lat: coords.latitude, lng: coords.longitude })
        try {
          const res  = await fetch(`/api/places?lat=${coords.latitude}&lng=${coords.longitude}`)
          const data = await res.json()
          if (data.error) { setError(data.error); setLoading(false); return }
          setPlaces(data.places || [])
        } catch {
          setError('搵唔到附近地點，請稍後再試')
        }
        setLoading(false)
      },
      (err) => {
        setError('請允許位置權限，AI 先可以搵附近題材')
        setLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [])

  const selectPlace = (p: Place) => {
    const typeInfo = getTypeInfo(p.types)
    const projId   = `proj_${Date.now()}`
    const proj = {
      id:         projId,
      user_id:    'local',
      name:       p.name,
      address:    p.address,
      duration:   60,
      script:     [],
      status:     'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // pass suggested category via URL
    }
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs = JSON.parse(raw)
      localStorage.setItem('soon-projects', JSON.stringify([proj, ...projs]))
    } catch {}
    // Pass suggested category as URL param
    router.push(`/project/${projId}/create?category=${typeInfo.category}`)
  }

  const refresh = () => {
    if (!coords) return
    setLoading(true)
    setPlaces([])
    fetch(`/api/places?lat=${coords.lat}&lng=${coords.lng}`)
      .then(r => r.json())
      .then(data => { setPlaces(data.places || []); setLoading(false) })
      .catch(() => { setError('重新載入失敗'); setLoading(false) })
  }

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>附近有咩拍</span>
        {!loading && places.length > 0 && (
          <button onClick={refresh} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontSize: 13 }}>重新整理</button>
        )}
        {(loading || places.length === 0) && <div style={{ width: 60 }} />}
      </div>

      <div style={{ flex: 1, padding: '16px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 80 }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--ink3)', fontSize: 13 }}>搵緊你附近嘅拍攝題材…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ paddingTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.7, marginBottom: 20 }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '12px 24px', fontSize: 13, color: '#fff', cursor: 'pointer' }}>
              重試
            </button>
          </div>
        )}

        {/* Places list */}
        {!loading && !error && places.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6 }}>
              搵到 {places.length} 個附近地點，點選即開始新 Project
            </p>

            {places.map(p => {
              const typeInfo = getTypeInfo(p.types)
              return (
                <button
                  key={p.id}
                  onClick={() => selectPlace(p)}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 0, textAlign: 'left', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s' }}
                >
                  {/* Photo */}
                  {p.photo && (
                    <div style={{ width: '100%', height: 120, overflow: 'hidden', background: 'var(--bg3)' }}>
                      <img
                        src={`/api/places/photo?ref=${p.photo}`}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}

                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--accent2)', background: 'rgba(77,107,254,0.12)', padding: '2px 8px', borderRadius: 'var(--pill)', flexShrink: 0 }}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: p.rating ? 6 : 0 }}>{p.address}</div>
                    {p.rating > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--accent2)' }}>★ {p.rating.toFixed(1)}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && places.length === 0 && (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
            附近搵唔到地點，試試移動位置後重試
          </div>
        )}

      </div>
    </main>
  )
}
