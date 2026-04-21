'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, ScriptPart, Duration } from '@/lib/types'
import { DURATION_STRUCTURE } from '@/lib/script-structure'

const CATEGORIES = [
  { id: 'food',       label: '餐廳 / 食物',     desc: '試食、評價、推介',         shotHook: 'medium', shotTest: 'product',  shotEnd: 'medium' },
  { id: 'attraction', label: '景點 / 體驗',     desc: '打卡、體驗、感受',         shotHook: 'wide',   shotTest: 'follow',   shotEnd: 'wide'   },
  { id: 'product',    label: '產品 / 好物',     desc: '開箱、試用、評測',         shotHook: 'close',  shotTest: 'close',    shotEnd: 'medium' },
  { id: 'vlog',       label: 'Vlog / 個人感受', desc: '日常、旅遊、生活紀錄',     shotHook: 'medium', shotTest: 'follow',   shotEnd: 'medium' },
  { id: 'people',     label: '幕後 / 人物故事', desc: '採訪、故事、職人精神',     shotHook: 'close',  shotTest: 'medium',   shotEnd: 'close'  },
]

const SHOT_LABELS: Record<string, { name: string; note: string }> = {
  wide:    { name: 'Wide Shot',   note: '交代環境，帶出場景全貌' },
  medium:  { name: 'Medium Shot', note: '主持半身，自然對話感' },
  close:   { name: 'Close-up',    note: '主體特寫，突出細節' },
  product: { name: '主體特寫',    note: '近鏡拍攝主角質感同造型' },
  follow:  { name: '手持跟拍',    note: '跟住主持移動，動感十足' },
  broll:   { name: 'B-roll',      note: '環境補充畫面，配合旁白' },
  overhead:{ name: '俯拍',        note: '由上方拍攝，展示全貌' },
  reaction:{ name: '反應鏡頭',    note: '主持真實反應同表情' },
}

export default function CreateVideo({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params)
  const router  = useRouter()

  const [project, setProject]     = useState<Project | null>(null)
  const [name, setName]           = useState('')
  const [address, setAddress]     = useState('')
  const [category, setCategory]   = useState('')
  const [step, setStep]           = useState<'input' | 'generating' | 'review'>('input')
  const [script, setScript]       = useState<ScriptPart[]>([])
  const [editIdx, setEditIdx]     = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('soon-projects')
      if (raw) {
        const projs: Project[] = JSON.parse(raw)
        const p = projs.find(x => x.id === id)
        if (p) { setProject(p); setName(p.name); setAddress(p.address) }
      }
    } catch {}
  }, [id])

  const saveProject = (updates: Partial<Project>) => {
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs: Project[] = JSON.parse(raw)
      const updated = projs.map(p => p.id === id
        ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
      localStorage.setItem('soon-projects', JSON.stringify(updated))
    } catch {}
  }

  const generate = async () => {
    if (!name.trim() || !category) return
    setStep('generating')

    try {
      const dur    = project?.duration || 60
      const struct = DURATION_STRUCTURE[dur as Duration]
      const cat    = CATEGORIES.find(c => c.id === category)!
      const partList = struct.parts.map(p => `- ${p.label}（${p.durationSec}秒）`).join('\n')
      const testLines = dur === 30 ? 4 : dur === 60 ? 5 : 6

      const prompt = `你係 SOON Core AI，幫 creator 寫一份短片劇本。
名稱：${name}
地址：${address || '未提供'}
類別：${cat.label}（${cat.desc}）
片長：${dur}秒
結構：
${partList}

重要規則：
1. 根據實際地址同地區生成，唔好假設係香港
2. 廣東話口語，短句，自然，唔oversell
3. 內容必須配合類別「${cat.label}」，唔好出現類別唔相關嘅描述
4. Hook：一句，帶懸念或衝擊感
5. 背景介紹（如有）：3-4句，介紹地方特色歷史
6. 每個實測 part：${testLines}句對白，包括介紹、過程、感受、反應
7. Ending：2句——第一句總結感受，第二句係 call to action（例：「你有冇興趣黎？留言話我知！」）
8. 輸出 JSON（唔好加其他文字）：
{
  "parts": [
    { "label": "Hook", "content": "一句" },
    { "label": "實測 1", "content": "第一句。第二句。第三句。第四句。" },
    { "label": "Ending", "content": "總結一句。Call to action。" }
  ]
}`

      const res    = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data   = await res.json()
      const parsed = JSON.parse(
        (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()
      )

      // Map shot types based on category + part type
      const getShotForPart = (type: string, idx: number) => {
        if (type === 'hook')       return { key: cat.shotHook }
        if (type === 'ending')     return { key: cat.shotEnd }
        if (type === 'background') return { key: 'broll' }
        if (type === 'trans')      return { key: 'medium' }
        // test parts: alternate between main shot and reaction
        return { key: idx % 2 === 0 ? cat.shotTest : 'reaction' }
      }

      const newScript: ScriptPart[] = struct.parts.map((p, i) => {
        const ai   = parsed.parts?.[i] || {}
        const shot = getShotForPart(p.type, i)
        const sl   = SHOT_LABELS[shot.key] || SHOT_LABELS.medium
        return {
          id:          `${id}-${p.type}-${i}`,
          type:        p.type,
          label:       p.label,
          content:     ai.content || `${p.label} 對白`,
          shotType:    sl.name,
          shotNote:    sl.note,
          durationSec: p.durationSec,
          status:      'pending',
        }
      })

      setScript(newScript)
      saveProject({ name, address, script: newScript, status: 'draft' })
      setStep('review')
    } catch (e) {
      console.error(e)
      setStep('input')
    }
  }

  const confirmScript = () => {
    saveProject({ script, status: 'filming' })
    router.push(`/project/${id}/camera`)
  }

  const updatePart = (i: number, content: string) => {
    setScript(prev => prev.map((p, j) => j === i ? { ...p, content } : p))
  }

  const canGenerate = name.trim() && category

  // ── Input ──
  if (step === 'input') return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>SOON</span>
        <span style={{ fontSize: 11, color: 'var(--ink3)', padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 'var(--pill)' }}>{project?.duration}秒</span>
      </div>

      <div style={{ flex: 1, padding: '28px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <h1 className="garamond" style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>新 Project</h1>
          <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6 }}>輸入資料，AI 幫你生成劇本</p>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="例：巴特莊陶瓷村" />
        </div>

        {/* Address */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
            地址 <span style={{ color: 'var(--ink3)', fontWeight: 400, letterSpacing: 0 }}>（幫 AI 搵資料）</span>
          </label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="例：Bát Tràng, Hà Nội, Vietnam" />
        </div>

        {/* Category */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>類別</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  background:   category === c.id ? 'var(--accent)' : 'var(--bg2)',
                  border:       `1px solid ${category === c.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)',
                  padding:      '12px 14px',
                  textAlign:    'left',
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: category === c.id ? '#fff' : 'var(--ink)', marginBottom: 3 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: category === c.id ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={generate}
          disabled={!canGenerate}
          style={{
            width: '100%', border: 'none', borderRadius: 'var(--pill)', padding: '16px',
            fontSize: 15, fontWeight: 500, cursor: canGenerate ? 'pointer' : 'not-allowed',
            background: canGenerate ? 'var(--accent)' : 'var(--bg3)',
            color:      canGenerate ? '#fff' : 'var(--ink3)',
            transition: 'all 0.2s',
          }}
        >
          AI 生成劇本 →
        </button>
      </div>
    </main>
  )

  // ── Generating ──
  if (step === 'generating') return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--ink3)', fontSize: 14 }}>AI 生成緊劇本…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  // ── Review ──
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setStep('input')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 修改</button>
        <span className="garamond" style={{ fontSize: 18 }}>劇本</span>
        <span style={{ fontSize: 11, color: 'var(--ink3)', padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 'var(--pill)' }}>{project?.duration}秒</span>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 120px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>點擊任何一個 part 可以編輯</p>

        {script.map((part, i) => (
          <div key={part.id}>
            {editIdx === i ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 8 }}>{part.label}</div>
                <textarea
                  value={part.content}
                  onChange={e => updatePart(i, e.target.value)}
                  style={{ minHeight: 120, lineHeight: 1.8, fontSize: 14, resize: 'vertical' }}
                  autoFocus
                />
                <button onClick={() => setEditIdx(null)} style={{ marginTop: 10, background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '10px 20px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>完成編輯</button>
              </div>
            ) : (
              <button
                onClick={() => setEditIdx(i)}
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 500 }}>{part.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{part.durationSec}秒</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{part.content}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {part.shotType} · {part.shotNote}
                </div>
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'linear-gradient(transparent, var(--bg) 40%)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button
            onClick={confirmScript}
            style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '16px', fontSize: 15, fontWeight: 500, color: '#fff', cursor: 'pointer' }}
          >
            確認劇本，開始拍攝 →
          </button>
        </div>
      </div>
    </main>
  )
}
