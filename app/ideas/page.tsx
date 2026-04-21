'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Temporary mock ideas — will be replaced with Supabase data from idea-brainstorm
const MOCK_IDEAS = [
  { id: '1', title: '越南街頭小食文化', category: '餐廳/食物', location: 'Vietnam', hook: '河內最神秘嘅巷仔食物，本地人先知', tags: ['越南', '街頭食物', '文化'] },
  { id: '2', title: '手工藝人幕後故事', category: '幕後/人物', location: 'Vietnam', hook: '呢個師傅做咗30年，你估唔到佢嘅收入', tags: ['越南', '職人', '手工藝'] },
  { id: '3', title: '隱世咖啡文化', category: '景點/體驗', location: 'Vietnam', hook: '河內有間咖啡店，入面嘅設計係……', tags: ['越南', '咖啡', '打卡'] },
  { id: '4', title: '市場食材溯源', category: '餐廳/食物', location: 'Vietnam', hook: '你食嘅越南菜食材係點嚟？我追蹤咗', tags: ['越南', '食材', '故事'] },
  { id: '5', title: '夜市攻略', category: '景點/體驗', location: 'Vietnam', hook: '河內夜市，當地人同遊客去嘅根本唔同地方', tags: ['越南', '夜市', '攻略'] },
]

export default function IdeasPage() {
  const router  = useRouter()
  const [ideas, setIdeas]   = useState(MOCK_IDEAS)
  const [filter, setFilter] = useState('all')

  const categories = ['all', '餐廳/食物', '景點/體驗', '幕後/人物']

  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.category === filter)

  const useIdea = (idea: typeof MOCK_IDEAS[0]) => {
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
    router.push(`/project/${projId}/create`)
  }

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>精選 Idea 庫</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Location badge */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12 }}>📍</span>
        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>根據你嘅位置顯示</span>
        <span style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>越南</span>
        <span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 'auto', background: 'rgba(77,107,254,0.12)', padding: '2px 10px', borderRadius: 'var(--pill)' }}>Beta</span>
      </div>

      {/* Category filter */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ background: filter === c ? 'var(--accent)' : 'var(--bg2)', border: `1px solid ${filter === c ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--pill)', padding: '6px 14px', fontSize: 12, color: filter === c ? '#fff' : 'var(--ink3)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
            {c === 'all' ? '全部' : c}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '16px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(idea => (
          <div key={idea.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{idea.title}</span>
              <span style={{ fontSize: 11, color: 'var(--accent2)', background: 'rgba(77,107,254,0.12)', padding: '2px 8px', borderRadius: 'var(--pill)', flexShrink: 0 }}>{idea.category}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', fontStyle: 'italic', lineHeight: 1.5 }}>「{idea.hook}」</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {idea.tags.map(t => (
                <span key={t} style={{ fontSize: 11, color: 'var(--ink3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 'var(--pill)' }}>#{t}</span>
              ))}
            </div>
            <button onClick={() => useIdea(idea)} style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '11px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
              用呢個 Idea 開始拍 →
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
