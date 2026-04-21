'use client'
import { useState, useEffect } from 'react'

type Sample = { id: number; category: string; part_type: string; text: string; source: string; active: boolean }

const CATEGORIES = ['food', 'attraction', 'product', 'vlog', 'people', 'general']
const PART_TYPES = ['hook', 'test', 'ending', 'background', 'any']

const ADMIN_KEY = 'soon-admin-2025'  // simple passcode

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false)
  const [passcode, setPasscode]   = useState('')
  const [samples, setSamples]     = useState<Sample[]>([])
  const [loading, setLoading]     = useState(false)
  const [tab, setTab]             = useState<'list' | 'add'>('list')
  const [form, setForm]           = useState({ category: 'food', part_type: 'hook', text: '', source: '' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  const login = () => {
    if (passcode === ADMIN_KEY) { setAuthed(true); loadSamples() }
    else setMsg('Wrong passcode')
  }

  const loadSamples = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/voice-samples')
      const data = await res.json()
      setSamples(data.samples || [])
    } catch { setMsg('Load failed') }
    setLoading(false)
  }

  const addSample = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/voice-samples', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, adminKey: ADMIN_KEY }),
      })
      const data = await res.json()
      if (data.ok) { setMsg('✓ 加入成功'); setForm(f => ({ ...f, text: '', source: '' })); loadSamples(); setTab('list') }
      else setMsg('Failed: ' + data.error)
    } catch { setMsg('Failed') }
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
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="garamond" style={{ fontSize: 24, textAlign: 'center' }}>SOON Admin</span>
        <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Passcode" style={{ textAlign: 'center' }} />
        {msg && <div style={{ fontSize: 13, color: '#E24B4A', textAlign: 'center' }}>{msg}</div>}
        <button onClick={login} style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '13px', fontSize: 14, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>Enter</button>
      </div>
    </main>
  )

  const catColor = (c: string) => ({ food:'#E8A87C', attraction:'#7CB9E8', product:'#A87CE8', vlog:'#7CE8A8', people:'#E87CA8', general:'var(--ink3)' })[c] || 'var(--ink3)'

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <span className="garamond" style={{ fontSize: 18 }}>Voice Samples</span>
        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{samples.filter(s => s.active).length} 個啟用</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['list', 'add'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, color: tab === t ? 'var(--ink)' : 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>
            {t === 'list' ? `樣本列表 (${samples.length})` : '+ 新增樣本'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '16px 20px 40px', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        {msg && <div style={{ fontSize: 13, color: msg.startsWith('✓') ? 'var(--green)' : '#E24B4A', marginBottom: 12 }}>{msg}</div>}

        {tab === 'list' && (
          loading ? <div style={{ color: 'var(--ink3)', fontSize: 13 }}>載入中…</div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {samples.map(s => (
              <div key={s.id} style={{ background: s.active ? 'var(--bg2)' : 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', opacity: s.active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, color: catColor(s.category), background: 'var(--bg3)', padding: '2px 8px', borderRadius: 'var(--pill)' }}>{s.category}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 'var(--pill)' }}>{s.part_type}</span>
                    {s.source && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>《{s.source}》</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleActive(s.id, s.active)} style={{ fontSize: 11, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--pill)', padding: '2px 10px', color: 'var(--ink3)', cursor: 'pointer' }}>{s.active ? '停用' : '啟用'}</button>
                    <button onClick={() => deleteSample(s.id)} style={{ fontSize: 11, background: 'none', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 'var(--pill)', padding: '2px 10px', color: '#E24B4A', cursor: 'pointer' }}>刪除</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{s.text}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink3)', display: 'block', marginBottom: 8 }}>類別</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))} style={{ padding: '6px 14px', borderRadius: 'var(--pill)', border: `1px solid ${form.category === c ? 'var(--accent)' : 'var(--border)'}`, background: form.category === c ? 'var(--accent)' : 'var(--bg2)', color: form.category === c ? '#fff' : 'var(--ink3)', fontSize: 12, cursor: 'pointer' }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink3)', display: 'block', marginBottom: 8 }}>Part 類型</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PART_TYPES.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, part_type: p }))} style={{ padding: '6px 14px', borderRadius: 'var(--pill)', border: `1px solid ${form.part_type === p ? 'var(--accent)' : 'var(--border)'}`, background: form.part_type === p ? 'var(--accent)' : 'var(--bg2)', color: form.part_type === p ? '#fff' : 'var(--ink3)', fontSize: 12, cursor: 'pointer' }}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink3)', display: 'block', marginBottom: 8 }}>樣本句子</label>
              <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="輸入一句真實劇本句子…" style={{ minHeight: 80, lineHeight: 1.7, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink3)', display: 'block', marginBottom: 8 }}>來源（可選）</label>
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="例：咖哩炒蟹" />
            </div>
            <button onClick={addSample} disabled={!form.text.trim() || saving} style={{ background: form.text.trim() ? 'var(--accent)' : 'var(--bg3)', border: 'none', borderRadius: 'var(--pill)', padding: '14px', fontSize: 14, fontWeight: 500, color: form.text.trim() ? '#fff' : 'var(--ink3)', cursor: form.text.trim() ? 'pointer' : 'not-allowed' }}>
              {saving ? '儲存中…' : '加入樣本庫'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
