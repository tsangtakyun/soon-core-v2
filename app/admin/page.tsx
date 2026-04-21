'use client'
import { useState, useRef } from 'react'

type Sample = { id: number; category: string; part_type: string; text: string; source: string; active: boolean }
type ExtractedSample = { part_type: string; text: string; selected: boolean }

const CATEGORIES = ['food', 'attraction', 'product', 'vlog', 'people', 'general']
const PART_TYPES  = ['hook', 'test', 'ending', 'background', 'any']
const ADMIN_KEY   = 'soon-admin-2025'

const catColor = (c: string) => ({ food:'#E8A87C', attraction:'#7CB9E8', product:'#A87CE8', vlog:'#7CE8A8', people:'#E87CA8', general:'var(--ink3)' }[c] || 'var(--ink3)')

export default function AdminPage() {
  const [authed, setAuthed]     = useState(false)
  const [passcode, setPasscode] = useState('')
  const [samples, setSamples]   = useState<Sample[]>([])
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState<'list'|'upload'|'add'>('list')
  const [msg, setMsg]           = useState('')

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]       = useState(false)
  const [extracted, setExtracted]       = useState<ExtractedSample[]>([])
  const [extractedTitle, setExtractedTitle]   = useState('')
  const [extractedCategory, setExtractedCategory] = useState('general')

  // Manual add state
  const [form, setForm]   = useState({ category: 'food', part_type: 'hook', text: '', source: '' })
  const [saving, setSaving] = useState(false)

  const login = () => {
    if (passcode === ADMIN_KEY) { setAuthed(true); loadSamples() }
    else setMsg('Wrong passcode')
  }

  const loadSamples = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/voice-samples?adminKey=${ADMIN_KEY}`)
      const data = await res.json()
      setSamples(data.samples || [])
    } catch { setMsg('Load failed') }
    setLoading(false)
  }

  // Upload + analyze docx
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.docx')) { setMsg('請上傳 .docx 檔案'); return }
    setUploading(true); setMsg(''); setExtracted([])
    try {
      const fd = new FormData()
      fd.append('adminKey', ADMIN_KEY)
      fd.append('file', file)
      const res  = await fetch('/api/admin/analyze-script', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { setMsg('分析失敗：' + data.error); setUploading(false); return }
      setExtractedTitle(data.title || file.name.replace('.docx', ''))
      setExtractedCategory(data.category || 'general')
      setExtracted((data.samples || []).map((s: any) => ({ ...s, selected: true })))
      setMsg('')
    } catch { setMsg('上傳失敗') }
    setUploading(false)
  }

  const saveExtracted = async () => {
    const toSave = extracted.filter(s => s.selected && s.text.trim())
    if (!toSave.length) return
    setSaving(true)
    let ok = 0
    for (const s of toSave) {
      const res  = await fetch('/api/admin/voice-samples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminKey: ADMIN_KEY, category: extractedCategory, part_type: s.part_type, text: s.text, source: extractedTitle }) })
      const data = await res.json()
      if (data.ok) ok++
    }
    setMsg(`✓ 成功加入 ${ok} 條樣本`)
    setExtracted([])
    setExtractedTitle('')
    loadSamples()
    setTab('list')
    setSaving(false)
  }

  const addManual = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    const res  = await fetch('/api/admin/voice-samples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, adminKey: ADMIN_KEY }) })
    const data = await res.json()
    if (data.ok) { setMsg('✓ 加入成功'); setForm(f => ({ ...f, text: '', source: '' })); loadSamples(); setTab('list') }
    else setMsg('Failed: ' + data.error)
    setSaving(false)
  }

  const toggleActive = async (id: number, active: boolean) => {
    await fetch('/api/admin/voice-samples', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active, adminKey: ADMIN_KEY }) })
    loadSamples()
  }

  const deleteSample = async (id: number) => {
    if (!confirm('確定刪除？')) return
    await fetch('/api/admin/voice-samples', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, adminKey: ADMIN_KEY }) })
    loadSamples()
  }

  if (!authed) return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:320, display:'flex', flexDirection:'column', gap:12 }}>
        <span className="garamond" style={{ fontSize:24, textAlign:'center' }}>SOON Admin</span>
        <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} onKeyDown={e => e.key==='Enter'&&login()} placeholder="Passcode" style={{ textAlign:'center' }} />
        {msg && <div style={{ fontSize:13, color:'#E24B4A', textAlign:'center' }}>{msg}</div>}
        <button onClick={login} style={{ background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'13px', fontSize:14, fontWeight:500, color:'#fff', cursor:'pointer' }}>Enter</button>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
        <span className="garamond" style={{ fontSize:18 }}>Voice Samples</span>
        <span style={{ fontSize:12, color:'var(--ink3)' }}>{samples.filter(s=>s.active).length} 個啟用</span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
        {(['list','upload','add'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg('') }} style={{ flex:1, padding:'12px', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`, color:tab===t?'var(--ink)':'var(--ink3)', cursor:'pointer', fontSize:13 }}>
            {t==='list' ? `樣本 (${samples.length})` : t==='upload' ? '📄 上傳劇本' : '✏️ 手動新增'}
          </button>
        ))}
      </div>

      <div style={{ flex:1, padding:'16px 20px 40px', maxWidth:600, width:'100%', margin:'0 auto' }}>
        {msg && <div style={{ fontSize:13, color:msg.startsWith('✓')?'var(--green)':'#E24B4A', marginBottom:14, padding:'10px 14px', background:'var(--bg2)', borderRadius:'var(--rs)' }}>{msg}</div>}

        {/* List */}
        {tab==='list' && (
          loading ? <div style={{ color:'var(--ink3)', fontSize:13 }}>載入中…</div> :
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {samples.map(s => (
              <div key={s.id} style={{ background:s.active?'var(--bg2)':'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 14px', opacity:s.active?1:0.5 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:catColor(s.category), background:'var(--bg3)', padding:'2px 8px', borderRadius:'var(--pill)' }}>{s.category}</span>
                    <span style={{ fontSize:11, color:'var(--ink3)', background:'var(--bg3)', padding:'2px 8px', borderRadius:'var(--pill)' }}>{s.part_type}</span>
                    {s.source && <span style={{ fontSize:11, color:'var(--ink3)' }}>《{s.source}》</span>}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => toggleActive(s.id, s.active)} style={{ fontSize:11, background:'none', border:'1px solid var(--border)', borderRadius:'var(--pill)', padding:'2px 10px', color:'var(--ink3)', cursor:'pointer' }}>{s.active?'停用':'啟用'}</button>
                    <button onClick={() => deleteSample(s.id)} style={{ fontSize:11, background:'none', border:'1px solid rgba(226,75,74,0.3)', borderRadius:'var(--pill)', padding:'2px 10px', color:'#E24B4A', cursor:'pointer' }}>刪除</button>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6 }}>{s.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        {tab==='upload' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {extracted.length === 0 ? (
              <>
                <div>
                  <h2 className="garamond" style={{ fontSize:24, fontWeight:400, marginBottom:8 }}>上傳劇本分析</h2>
                  <p style={{ fontSize:13, color:'var(--ink3)', lineHeight:1.6 }}>上傳一份 .docx 劇本，AI 自動提煉最有代表性嘅句子做語氣樣本，你確認後一鍵加入樣本庫。</p>
                </div>
                <input ref={fileRef} type="file" accept=".docx" style={{ display:'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
                {uploading ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'40px 0' }}>
                    <div style={{ width:28, height:28, border:'2px solid var(--border2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    <p style={{ color:'var(--ink3)', fontSize:13 }}>AI 分析緊劇本…</p>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} style={{ width:'100%', background:'var(--bg2)', border:'2px dashed var(--border2)', borderRadius:'var(--r)', padding:'40px 20px', fontSize:15, color:'var(--ink2)', cursor:'pointer', textAlign:'center' }}>
                    📄 點擊上傳 .docx 劇本
                  </button>
                )}
              </>
            ) : (
              <>
                <div>
                  <h2 className="garamond" style={{ fontSize:22, fontWeight:400, marginBottom:4 }}>{extractedTitle}</h2>
                  <p style={{ fontSize:13, color:'var(--ink3)', marginBottom:12 }}>AI 提煉咗以下句子，剔選你想加入嘅，然後確認</p>
                  {/* Category selector */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setExtractedCategory(c)} style={{ padding:'5px 12px', borderRadius:'var(--pill)', border:`1px solid ${extractedCategory===c?'var(--accent)':'var(--border)'}`, background:extractedCategory===c?'var(--accent)':'var(--bg2)', color:extractedCategory===c?'#fff':'var(--ink3)', fontSize:12, cursor:'pointer' }}>{c}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {extracted.map((s, i) => (
                    <div key={i} onClick={() => setExtracted(prev => prev.map((x,j) => j===i ? {...x, selected:!x.selected} : x))}
                      style={{ background:s.selected?'var(--bg2)':'var(--bg3)', border:`1px solid ${s.selected?'var(--accent)':'var(--border)'}`, borderRadius:'var(--r)', padding:'12px 14px', cursor:'pointer', opacity:s.selected?1:0.5 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:11, color:'var(--accent2)', background:'rgba(77,107,254,0.12)', padding:'2px 8px', borderRadius:'var(--pill)' }}>{s.part_type}</span>
                        <span style={{ fontSize:12, color:s.selected?'var(--green)':'var(--ink3)' }}>{s.selected?'✓ 選取':'○'}</span>
                      </div>
                      <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6 }}>{s.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => { setExtracted([]); setMsg('') }} style={{ flex:1, background:'none', border:'1px solid var(--border)', borderRadius:'var(--pill)', padding:'13px', fontSize:13, color:'var(--ink3)', cursor:'pointer' }}>重新上傳</button>
                  <button onClick={saveExtracted} disabled={saving || !extracted.some(s=>s.selected)} style={{ flex:2, background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'13px', fontSize:14, fontWeight:500, color:'#fff', cursor:'pointer' }}>
                    {saving ? '儲存中…' : `加入 ${extracted.filter(s=>s.selected).length} 條樣本`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Manual add */}
        {tab==='add' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, color:'var(--ink3)', display:'block', marginBottom:8 }}>類別</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CATEGORIES.map(c => <button key={c} onClick={() => setForm(f=>({...f,category:c}))} style={{ padding:'6px 14px', borderRadius:'var(--pill)', border:`1px solid ${form.category===c?'var(--accent)':'var(--border)'}`, background:form.category===c?'var(--accent)':'var(--bg2)', color:form.category===c?'#fff':'var(--ink3)', fontSize:12, cursor:'pointer' }}>{c}</button>)}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--ink3)', display:'block', marginBottom:8 }}>Part 類型</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {PART_TYPES.map(p => <button key={p} onClick={() => setForm(f=>({...f,part_type:p}))} style={{ padding:'6px 14px', borderRadius:'var(--pill)', border:`1px solid ${form.part_type===p?'var(--accent)':'var(--border)'}`, background:form.part_type===p?'var(--accent)':'var(--bg2)', color:form.part_type===p?'#fff':'var(--ink3)', fontSize:12, cursor:'pointer' }}>{p}</button>)}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--ink3)', display:'block', marginBottom:8 }}>樣本句子</label>
              <textarea value={form.text} onChange={e => setForm(f=>({...f,text:e.target.value}))} placeholder="輸入一句真實劇本句子…" style={{ minHeight:80, lineHeight:1.7, fontSize:14 }} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--ink3)', display:'block', marginBottom:8 }}>來源（可選）</label>
              <input value={form.source} onChange={e => setForm(f=>({...f,source:e.target.value}))} placeholder="例：咖哩炒蟹" />
            </div>
            <button onClick={addManual} disabled={!form.text.trim()||saving} style={{ background:form.text.trim()?'var(--accent)':'var(--bg3)', border:'none', borderRadius:'var(--pill)', padding:'14px', fontSize:14, fontWeight:500, color:form.text.trim()?'#fff':'var(--ink3)', cursor:form.text.trim()?'pointer':'not-allowed' }}>
              {saving?'儲存中…':'加入樣本庫'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
