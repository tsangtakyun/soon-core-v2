'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Idea = {
  id: number
  title: string
  topic: string
  summary: string
  hook: string
  tags: string[]
  viralScore: number
  country: string
  distanceKm: number | null
  category: string
}

const COUNTRIES: { code: string; label: string; emoji: string }[] = [
  { code: 'VN', label: '越南',   emoji: '🇻🇳' },
  { code: 'HK', label: '香港',   emoji: '🇭🇰' },
  { code: 'TW', label: '台灣',   emoji: '🇹🇼' },
  { code: 'JP', label: '日本',   emoji: '🇯🇵' },
  { code: 'TH', label: '泰國',   emoji: '🇹🇭' },
  { code: 'FR', label: '法國',   emoji: '🇫🇷' },
  { code: 'OTHER', label: '其他', emoji: '🌍' },
]

// Map lat/lng to country code (rough bounding boxes)
function detectCountry(lat: number, lng: number): string {
  if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) return 'VN'
  if (lat >= 22 && lat <= 23 && lng >= 113 && lng <= 115) return 'HK'
  if (lat >= 21 && lat <= 26 && lng >= 119 && lng <= 123) return 'TW'
  if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 146) return 'JP'
  if (lat >= 5  && lat <= 21 && lng >= 97  && lng <= 106) return 'TH'
  if (lat >= 41 && lat <= 52 && lng >= -5  && lng <= 10)  return 'FR'
  return 'OTHER'
}

const SCORE_COLOR = (s: number) => s >= 90 ? '#1DB954' : s >= 70 ? '#FAC775' : 'var(--ink3)'

export default function IdeasPage() {
  const router = useRouter()
  const [allIdeas, setAllIdeas]   = useState<Idea[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [country, setCountry]     = useState<string | null>(null)  // null = not selected yet
  const [expanded, setExpanded]   = useState<number | null>(null)

  useEffect(() => {
    // Get location to auto-select country
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const detected = detectCountry(coords.latitude, coords.longitude)
        setCountry(detected)
        loadIdeas(coords.latitude, coords.longitude)
      },
      async () => {
        // No location — load all, let user pick
        loadIdeas(0, 0)
      },
      { timeout: 5000 }
    )
  }, [])

  const loadIdeas = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/ideas?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setAllIdeas(data.ideas || [])
    } catch { setError('載入失敗，請重試') }
    setLoading(false)
  }

  // Ideas filtered by selected country
  const filtered = country ? allIdeas.filter(i => i.country === country) : []

  // Only show countries that have ideas
  const availableCountries = COUNTRIES.filter(c =>
    allIdeas.some(i => i.country === c.code)
  )

  const useIdea = (idea: Idea) => {
    const projId = `proj_${Date.now()}`
    const proj   = {
      id: projId, user_id: 'local', name: idea.title, address: '',
      duration: 60, script: [], status: 'draft',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    try {
      const raw = localStorage.getItem('soon-projects') || '[]'
      localStorage.setItem('soon-projects', JSON.stringify([proj, ...JSON.parse(raw)]))
    } catch {}
    router.push(`/project/${projId}/create?category=${idea.category}`)
  }

  const selectedCountryInfo = COUNTRIES.find(c => c.code === country)

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>精選 Idea 庫</span>
        <span style={{ fontSize: 11, color: 'var(--accent2)', background: 'rgba(77,107,254,0.12)', padding: '3px 10px', borderRadius: 'var(--pill)' }}>Beta</span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--ink3)', fontSize: 13 }}>載入中…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>{error}</div>
        </div>
      ) : !country ? (
        // Country picker
        <div style={{ flex: 1, padding: '32px 20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
          <h2 className="garamond" style={{ fontSize: 26, fontWeight: 400, marginBottom: 8 }}>你而家喺邊度？</h2>
          <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 24, lineHeight: 1.6 }}>揀你嘅地區，睇適合當地嘅拍攝 Ideas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableCountries.map(c => (
              <button key={c.code} onClick={() => setCountry(c.code)} style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}>
                <span style={{ fontSize: 28 }}>{c.emoji}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
                    {allIdeas.filter(i => i.country === c.code).length} 個 Ideas
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--ink3)', fontSize: 18 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Ideas list for selected country
        <>
          {/* Country header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => { setCountry(null); setExpanded(null) }} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
              ← 返回
            </button>
            <span style={{ fontSize: 20 }}>{selectedCountryInfo?.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{selectedCountryInfo?.label}</span>
            <span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 4 }}>{filtered.length} 個 Ideas</span>
          </div>

          <div style={{ flex: 1, padding: '16px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ paddingTop: 40, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>暫時未有呢個地區嘅 Ideas</div>
            ) : (
              filtered.map(idea => (
                <div key={idea.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(expanded === idea.id ? null : idea.id)} style={{ width: '100%', padding: '14px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{idea.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: SCORE_COLOR(idea.viralScore), flexShrink: 0 }}>▲ {idea.viralScore}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink2)', fontStyle: 'italic', lineHeight: 1.5 }}>「{idea.hook}」</div>
                    {idea.distanceKm !== null && idea.distanceKm < 500 && (
                      <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 5 }}>📍 距你 {idea.distanceKm} km</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>{expanded === idea.id ? '收起 ▲' : '睇詳情 ▼'}</div>
                  </button>

                  {expanded === idea.id && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 10 }}>{idea.summary}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {idea.tags.map(t => (
                          <span key={t} style={{ fontSize: 11, color: 'var(--ink3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 'var(--pill)' }}>#{t}</span>
                        ))}
                      </div>
                      <button onClick={() => useIdea(idea)} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '12px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
                        用呢個 Idea 開始拍 →
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  )
}
