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

const COUNTRY_NAMES: Record<string, string> = {
  VN: '越南', TW: '台灣', FR: '法國', HK: '香港', OTHER: '其他',
}

const SCORE_COLOR = (s: number) => s >= 90 ? '#1DB954' : s >= 70 ? '#FAC775' : 'var(--ink3)'

export default function IdeasPage() {
  const router  = useRouter()
  const [ideas, setIdeas]       = useState<Idea[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`/api/ideas?lat=${coords.latitude}&lng=${coords.longitude}`)
          const data = await res.json()
          if (data.error) setError(data.error)
          else setIdeas(data.ideas || [])
        } catch { setError('載入失敗') }
        setLoading(false)
      },
      async () => {
        // No location — still fetch without coordinates
        try {
          const res  = await fetch('/api/ideas')
          const data = await res.json()
          setIdeas(data.ideas || [])
        } catch { setError('載入失敗') }
        setLoading(false)
      },
      { timeout: 5000 }
    )
  }, [])

  const countries = ['all', ...Array.from(new Set(ideas.map(i => i.country)))]
  const filtered  = filter === 'all' ? ideas : ideas.filter(i => i.country === filter)

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

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>精選 Idea 庫</span>
        <span style={{ fontSize: 11, color: 'var(--accent2)', background: 'rgba(77,107,254,0.12)', padding: '3px 10px', borderRadius: 'var(--pill)' }}>Beta</span>
      </div>

      {/* Country filter */}
      <div style={{ padding: '10px 20px', display: 'flex', gap: 8, overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
        {countries.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ background: filter === c ? 'var(--accent)' : 'var(--bg2)', border: `1px solid ${filter === c ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--pill)', padding: '6px 14px', fontSize: 12, color: filter === c ? '#fff' : 'var(--ink3)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {c === 'all' ? '全部' : COUNTRY_NAMES[c] || c}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '16px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 60 }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--ink3)', fontSize: 13 }}>載入精選 Ideas…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && error && (
          <div style={{ paddingTop: 40, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>{error}</div>
        )}

        {!loading && !error && (
          <>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>
              {filtered.length} 個精選 Idea · 按病毒力排序
            </p>
            {filtered.map(idea => (
              <div key={idea.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {/* Header */}
                <button onClick={() => setExpanded(expanded === idea.id ? null : idea.id)} style={{ width: '100%', padding: '14px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{idea.title}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: SCORE_COLOR(idea.viralScore) }}>
                        ▲ {idea.viralScore}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{COUNTRY_NAMES[idea.country] || idea.country}</span>
                    </div>
                  </div>
                  {/* Hook */}
                  <div style={{ fontSize: 13, color: 'var(--ink2)', fontStyle: 'italic', lineHeight: 1.5 }}>「{idea.hook}」</div>
                  {/* Distance */}
                  {idea.distanceKm !== null && idea.distanceKm < 500 && (
                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 5 }}>📍 距你 {idea.distanceKm} km</div>
                  )}
                </button>

                {/* Expanded */}
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
            ))}
          </>
        )}
      </div>
    </main>
  )
}
