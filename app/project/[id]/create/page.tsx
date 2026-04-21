'use client'
import { useState, useEffect, use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Project, ScriptPart, Duration } from '@/lib/types'
import { DURATION_STRUCTURE } from '@/lib/script-structure'

const CATEGORIES = [
  { id: 'food',       label: '餐廳 / 食物',      desc: '試食、評價、推介' },
  { id: 'attraction', label: '景點 / 體驗',      desc: '打卡、體驗、感受' },
  { id: 'product',    label: '產品 / 好物',      desc: '開箱、試用、評測' },
  { id: 'vlog',       label: 'Vlog / 個人感受',  desc: '日常、旅遊、生活紀錄' },
  { id: 'people',     label: '幕後 / 人物故事',  desc: '採訪、故事、職人精神' },
]

export type ScriptLine = {
  text: string; shot: string; visual: string
}

type PlaceDetails = {
  name: string
  rating: number
  totalRatings: number
  priceLevel?: number
  types: string[]
  editorialSummary: string
  reviews: { rating: number; text: string; time: string }[]
  isOpen?: boolean
}

function CreateVideoInner({ params }: { params: Promise<{ id: string }> }) {
  const { id }       = use(params)
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [project, setProject]       = useState<Project | null>(null)
  const [name, setName]             = useState('')
  const [address, setAddress]       = useState('')
  const [category, setCategory]     = useState(searchParams.get('category') || '')
  const [step, setStep]             = useState<'input' | 'generating' | 'review'>('input')
  const [script, setScript]         = useState<ScriptPart[]>([])
  const [editIdx, setEditIdx]       = useState<number | null>(null)
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null)
  const [fetchingPlace, setFetchingPlace] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('soon-projects')
      if (raw) {
        const p = JSON.parse(raw).find((x: Project) => x.id === id)
        if (p) { setProject(p); setName(p.name); setAddress(p.address) }
      }
    } catch {}
  }, [id])

  const saveProject = (updates: Partial<Project>) => {
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs: Project[] = JSON.parse(raw)
      localStorage.setItem('soon-projects', JSON.stringify(
        projs.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
      ))
    } catch {}
  }

  // Fetch place details when name/address filled
  const fetchPlaceDetails = async () => {
    if (!name.trim()) return
    setFetchingPlace(true)
    try {
      const res  = await fetch(`/api/place-details?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`)
      const data = await res.json()
      setPlaceDetails(data.details)
    } catch {}
    setFetchingPlace(false)
  }

  const generate = async () => {
    if (!name.trim() || !category) return
    setStep('generating')
    try {
      const dur      = project?.duration || 60
      const struct   = DURATION_STRUCTURE[dur as Duration]
      const cat      = CATEGORIES.find(c => c.id === category)!
      const partList = struct.parts.map(p => `- ${p.label}（${p.durationSec}秒）`).join('\n')
      const testLines = dur === 30 ? 4 : dur === 60 ? 5 : 6

      // Build real data context for AI
      let realDataContext = ''
      if (placeDetails) {
        const stars    = '★'.repeat(Math.round(placeDetails.rating)) + '☆'.repeat(5 - Math.round(placeDetails.rating))
        const price    = placeDetails.priceLevel ? '$'.repeat(placeDetails.priceLevel) : '未知'
        const reviews  = placeDetails.reviews.map((r, i) =>
          `評論${i+1}（${r.rating}星）：${r.text}`
        ).join('\n')

        realDataContext = `
【真實資料 — 必須根據以下資料寫稿，唔好自己估】
地點名稱：${placeDetails.name}
Google評分：${placeDetails.rating} / 5（${placeDetails.totalRatings} 個評論）${stars}
價格水平：${price}
Google真實評論：
${reviews || '暫無評論'}
${placeDetails.editorialSummary ? `官方簡介：${placeDetails.editorialSummary}` : ''}

重要：
- 如果評分高（4.5+），可以正面推介
- 如果評分中等（3.5-4.4），要客觀，提出優缺點
- 如果評分低（3.5以下），要誠實，唔好硬講好
- 稿中嘅具體描述必須來自真實評論，唔好自己發明`
      } else {
        realDataContext = `
【注意：搵唔到呢個地方嘅真實資料】
- 只根據名稱同地址估計，唔確定嘅資訊唔好寫落稿
- 避免具體數字（例如幾多錢）或無根據嘅讚美
- 多用探索性語氣（「聽講」「據說」「今日嚟試下」）`
      }

      const prompt = `你係 SOON Core AI，幫 creator 寫一份真實、有個性、唔oversell嘅短片劇本。

名稱：${name}
地址：${address || '未提供'}
類別：${cat.label}（${cat.desc}）
片長：${dur}秒
結構：
${partList}
${realDataContext}

寫稿規則：
1. 廣東話口語，短句，有個性，唔係機器人語氣
2. 要有立場——好就講好，唔好就講唔好，唔好全部都正面
3. Hook：一句，帶真實懸念或衝擊感（可以係質疑、挑戰、反差）
4. 背景介紹（如有）：根據真實資料，3-4句
5. 每個實測 part：${testLines}句，包括過程、真實感受、具體細節
6. Ending：2句——真實總結 + call to action

每句對白提供：
- shot：拍攝方式（Wide Shot / Medium Shot / Close-up / B-roll / 手持跟拍 / 俯拍 / 反應鏡頭）
- visual：具體畫面描述（搵咩、拍咩角度）

輸出 JSON（唔好加其他文字）：
{
  "parts": [
    {
      "label": "Hook",
      "lines": [{ "text": "對白", "shot": "shot type", "visual": "畫面描述" }]
    }
  ]
}`

      const res    = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
      })
      const data   = await res.json()
      const parsed = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim())

      const SHOT_LABELS: Record<string, { name: string; note: string }> = {
        wide:     { name: 'Wide Shot',   note: '交代環境，帶出場景全貌' },
        medium:   { name: 'Medium Shot', note: '主持半身，自然對話感' },
        close:    { name: 'Close-up',    note: '主體特寫，突出細節' },
        product:  { name: '主體特寫',    note: '近鏡拍攝主角質感同造型' },
        follow:   { name: '手持跟拍',    note: '跟住主持移動，動感十足' },
        broll:    { name: 'B-roll',      note: '環境補充畫面，配合旁白' },
        overhead: { name: '俯拍',        note: '由上方拍攝，展示全貌' },
        reaction: { name: '反應鏡頭',    note: '主持真實反應同表情' },
      }

      const newScript: ScriptPart[] = struct.parts.map((p, i) => {
        const aiPart = parsed.parts?.[i] || {}
        const lines: ScriptLine[] = (aiPart.lines || []).map((l: any) => ({
          text: l.text || '', shot: l.shot || 'Medium Shot', visual: l.visual || '',
        }))
        const stype = SHOT_LABELS[p.shotType as keyof typeof SHOT_LABELS]
        return {
          id: `${id}-${p.type}-${i}`, type: p.type, label: p.label,
          content: lines.map(l => l.text).join('。') || `${p.label} 對白`,
          shotType: lines[0]?.shot || stype?.name || 'Medium Shot',
          shotNote: lines[0]?.visual || stype?.note || '',
          durationSec: p.durationSec, status: 'pending',
          lines,
        } as ScriptPart & { lines: ScriptLine[] }
      })

      setScript(newScript)
      saveProject({ name, address, script: newScript, status: 'draft' })
      setStep('review')
    } catch (e) {
      console.error(e); setStep('input')
    }
  }

  const confirmScript = () => { saveProject({ script, status: 'filming' }); router.push(`/project/${id}/camera`) }
  const updatePart    = (i: number, content: string) => setScript(prev => prev.map((p, j) => j === i ? { ...p, content } : p))
  const canGenerate   = name.trim() && category

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

        <div>
          <label style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} onBlur={fetchPlaceDetails} placeholder="例：巴特莊陶瓷村" />
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
            地址 <span style={{ fontWeight: 400, letterSpacing: 0, color: 'var(--ink3)' }}>（幫 AI 搵真實資料）</span>
          </label>
          <input value={address} onChange={e => setAddress(e.target.value)} onBlur={fetchPlaceDetails} placeholder="例：Bát Tràng, Hà Nội, Vietnam" />
          {/* Place details preview */}
          {fetchingPlace && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>搵緊地方資料…</div>}
          {placeDetails && !fetchingPlace && (
            <div style={{ marginTop: 8, background: 'var(--bg3)', borderRadius: 'var(--rs)', padding: '10px 12px', borderLeft: '2px solid var(--green)' }}>
              <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>✓ 搵到真實資料</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)' }}>
                ★ {placeDetails.rating} ({placeDetails.totalRatings} 個評論)
                {placeDetails.priceLevel ? ` · ${'$'.repeat(placeDetails.priceLevel)}` : ''}
              </div>
              {placeDetails.reviews[0] && (
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.5 }}>
                  「{placeDetails.reviews[0].text.slice(0, 60)}…」
                </div>
              )}
            </div>
          )}
          {!placeDetails && !fetchingPlace && name.trim() && address.trim() && (
            <div style={{ marginTop: 8, background: 'var(--bg3)', borderRadius: 'var(--rs)', padding: '8px 12px', borderLeft: '2px solid var(--border2)' }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>搵唔到真實資料，AI 會用探索性語氣寫稿</div>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>類別</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} style={{
                background: category === c.id ? 'var(--accent)' : 'var(--bg2)',
                border: `1px solid ${category === c.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--r)', padding: '12px 14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: category === c.id ? '#fff' : 'var(--ink)', marginBottom: 3 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: category === c.id ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={!canGenerate} style={{
          width: '100%', border: 'none', borderRadius: 'var(--pill)', padding: '16px',
          fontSize: 15, fontWeight: 500, cursor: canGenerate ? 'pointer' : 'not-allowed',
          background: canGenerate ? 'var(--accent)' : 'var(--bg3)',
          color: canGenerate ? '#fff' : 'var(--ink3)', transition: 'all 0.2s',
        }}>AI 生成劇本 →</button>
      </div>
    </main>
  )

  // ── Generating ──
  if (step === 'generating') return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--ink3)', fontSize: 14 }}>
        {placeDetails ? '根據真實資料生成緊劇本…' : 'AI 生成緊劇本…'}
      </p>
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
        {placeDetails && (
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(29,185,84,0.3)', borderRadius: 'var(--rs)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--green)' }}>✓</span>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>根據 Google {placeDetails.rating}★ ({placeDetails.totalRatings} 評論) 生成</span>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 4 }}>點擊任何一個 part 可以編輯</p>
        {script.map((part, i) => {
          const lines: ScriptLine[] = (part as any).lines || []
          return (
            <div key={part.id}>
              {editIdx === i ? (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 8 }}>{part.label}</div>
                  <textarea value={part.content} onChange={e => updatePart(i, e.target.value)} style={{ minHeight: 120, lineHeight: 1.8, fontSize: 14, resize: 'vertical' }} autoFocus />
                  <button onClick={() => setEditIdx(null)} style={{ marginTop: 10, background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '10px 20px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>完成編輯</button>
                </div>
              ) : (
                <button onClick={() => setEditIdx(i)} style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 500 }}>{part.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{part.durationSec}秒</span>
                  </div>
                  {lines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {lines.map((line, li) => (
                        <div key={li} style={{ borderLeft: '2px solid var(--border2)', paddingLeft: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 3 }}>{line.shot}</div>
                          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>{line.text}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{line.visual}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{part.content}</div>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'linear-gradient(transparent, var(--bg) 40%)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button onClick={confirmScript} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '16px', fontSize: 15, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
            確認劇本，開始拍攝 →
          </button>
        </div>
      </div>
    </main>
  )
}

export default function CreateVideo({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><CreateVideoInner params={params} /></Suspense>
}
