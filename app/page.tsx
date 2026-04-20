'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, Duration } from '@/lib/types'

const DURATIONS: { value: Duration; label: string; desc: string }[] = [
  { value: 30, label: '30 秒', desc: 'Hook + 2 實測 + Ending' },
  { value: 60, label: '60 秒', desc: 'Hook + 背景 + 3 實測 + Ending' },
  { value: 90, label: '90 秒', desc: 'Hook + 詳細背景 + 3 實測 + Ending' },
]

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects]       = useState<Project[]>([])
  const [showNew, setShowNew]         = useState(false)
  const [selDuration, setSelDuration] = useState<Duration>(60)
  const [loading, setLoading]         = useState(false)

  // Load projects from localStorage (no login yet)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('soon-projects')
      if (raw) setProjects(JSON.parse(raw))
    } catch {}
  }, [])

  const createProject = () => {
    setLoading(true)
    const id  = `proj_${Date.now()}`
    const proj: Project = {
      id,
      user_id:    'local',
      name:       '',
      address:    '',
      duration:   selDuration,
      script:     [],
      status:     'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const updated = [proj, ...projects]
    localStorage.setItem('soon-projects', JSON.stringify(updated))
    router.push(`/project/${id}/create`)
  }

  const activeProject = projects.find(p => p.status === 'filming')
  const doneProjects  = projects.filter(p => p.status === 'done')

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <span className="garamond" style={{ fontSize: 22, letterSpacing: '0.02em' }}>SOON</span>
        <span style={{ fontSize: 11, color: 'var(--ink3)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 'var(--pill)', letterSpacing: '0.08em' }}>CORE</span>
      </div>

      <div style={{ flex: 1, padding: '28px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Active project */}
        {activeProject && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', marginBottom: 10 }}>繼續拍攝</div>
            <button
              onClick={() => router.push(`/project/${activeProject.id}/camera`)}
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--r)', padding: '16px 18px', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>{activeProject.name || '未命名 Project'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {activeProject.duration}秒 · {activeProject.script.filter(p => p.status === 'filmed').length}/{activeProject.script.length} 個鏡頭完成
              </div>
              <div style={{ marginTop: 10, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${activeProject.script.length ? (activeProject.script.filter(p=>p.status==='filmed').length/activeProject.script.length)*100 : 0}%`, transition: 'width 0.3s' }} />
              </div>
            </button>
          </div>
        )}

        {/* New project */}
        {!showNew ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setShowNew(true)}
              style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '16px', fontSize: 15, fontWeight: 500, color: '#fff', cursor: 'pointer' }}
            >
              + 新 Project
            </button>
            <button
              onClick={() => router.push('/nearby')}
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--pill)', padding: '14px', fontSize: 14, color: 'var(--ink2)', cursor: 'pointer' }}
            >
              附近有咩拍 →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', marginBottom: 12 }}>揀片長</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setSelDuration(d.value)}
                  style={{ background: selDuration === d.value ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${selDuration === d.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>{d.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{d.desc}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--pill)', padding: '13px', fontSize: 13, color: 'var(--ink3)', cursor: 'pointer' }}>取消</button>
              <button onClick={createProject} disabled={loading} style={{ flex: 2, background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '13px', fontSize: 14, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
                {loading ? '載入中…' : '開始 →'}
              </button>
            </div>
          </div>
        )}

        {/* Past projects */}
        {doneProjects.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', marginBottom: 10 }}>過往 Projects</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {doneProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/project/${p.id}`)}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{p.name || '未命名'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{p.duration}秒 · {new Date(p.created_at).toLocaleDateString('zh-HK')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
