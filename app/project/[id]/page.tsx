'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('soon-projects')
      if (raw) {
        const p = JSON.parse(raw).find((x: Project) => x.id === id)
        if (p) setProject(p)
      }
    } catch {}
  }, [id])

  if (!project) return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'var(--ink3)', fontSize:14 }}>載入中…</div>
    </main>
  )

  const filmed  = project.script.filter(p => p.status === 'filmed').length
  const skipped = project.script.filter(p => p.status === 'skipped').length

  return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'var(--ink3)', cursor:'pointer', fontSize:13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize:18 }}>Project</span>
        <div style={{ width:40 }} />
      </div>

      <div style={{ flex:1, padding:'24px 20px 40px', maxWidth:480, width:'100%', margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <h1 className="garamond" style={{ fontSize:28, fontWeight:400, marginBottom:4 }}>{project.name}</h1>
          <p style={{ fontSize:13, color:'var(--ink3)' }}>{project.address} · {project.duration}秒 · 拍咗 {filmed}/{project.script.length} 個鏡頭</p>
        </div>

        {project.status === 'filming' && (
          <button onClick={() => router.push(`/project/${id}/camera`)} style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'14px', fontSize:14, fontWeight:500, color:'#fff', cursor:'pointer' }}>
            繼續拍攝 →
          </button>
        )}

        <div>
          <div style={{ fontSize:11, color:'var(--ink3)', letterSpacing:'0.1em', marginBottom:10 }}>確認劇本</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {project.script.map((part, i) => (
              <div key={part.id} style={{ background:'var(--bg2)', border:`1px solid ${part.status==='filmed'?'rgba(29,185,84,0.3)':part.status==='skipped'?'var(--border)':'var(--border)'}`, borderRadius:'var(--r)', padding:'12px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontSize:11, color: part.status==='filmed'?'var(--green)':part.status==='skipped'?'var(--ink3)':'var(--accent2)', fontWeight:500 }}>
                    {part.label} {part.status==='filmed'?'✓':part.status==='skipped'?'(跳過)':''}
                  </span>
                  <span style={{ fontSize:11, color:'var(--ink3)' }}>{part.shotType} · {part.durationSec}秒</span>
                </div>
                <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6 }}>{part.content}</div>
              </div>
            ))}
          </div>
        </div>

        {skipped > 0 && (
          <button onClick={() => router.push(`/project/${id}/camera`)} style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'var(--pill)', padding:'13px', fontSize:13, color:'var(--ink)', cursor:'pointer' }}>
            補拍跳過嘅 {skipped} 個鏡頭
          </button>
        )}
      </div>
    </main>
  )
}
