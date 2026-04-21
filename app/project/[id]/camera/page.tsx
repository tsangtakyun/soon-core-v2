'use client'
import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, ScriptPart } from '@/lib/types'

type ScriptLine = { text: string; shot: string; visual: string }
type Question   = { id: string; text: string; type: 'rating' | 'text' | 'yesno' }
type Analysis   = { subject: string; category: string; questions: Question[] }
type Answers    = Record<string, string>

function getMimeType() {
  const types = ['video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

const Spinner = () => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
    <div style={{ width:28, height:28, border:'2px solid var(--border2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

// ── Photo Analysis ──
function PhotoAnalysis({ partLabel, category, originalLines, onComplete, onSkip }: {
  partLabel: string; category: string; originalLines: ScriptLine[]
  onComplete: (refinedLines: ScriptLine[]) => void; onSkip: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase]           = useState<'capture'|'analyzing'|'questions'|'refining'|'review'>('capture')
  const [analysis, setAnalysis]     = useState<Analysis | null>(null)
  const [answers, setAnswers]       = useState<Answers>({})
  const [preview, setPreview]       = useState<string | null>(null)
  const [refinedLines, setRefined]  = useState<ScriptLine[]>([])
  const [editIdx, setEditIdx]       = useState<number | null>(null)
  const [error, setError]           = useState('')

  const handlePhoto = async (file: File) => {
    setPreview(URL.createObjectURL(file)); setPhase('analyzing')
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = rej; r.readAsDataURL(file)
      })
      const r    = await fetch('/api/analyze-photo', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type, partLabel, category }),
      })
      const data = await r.json()
      if (data.questions) { setAnalysis(data); setPhase('questions') }
      else { setError('分析失敗，請重試'); setPhase('capture') }
    } catch { setError('分析失敗，請重試'); setPhase('capture') }
  }

  const submitAnswers = async () => {
    if (!analysis) return
    setPhase('refining')
    try {
      const r    = await fetch('/api/refine-script', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ originalLines, subject: analysis.subject, answers, questions: analysis.questions, partLabel }),
      })
      const data = await r.json()
      setRefined(data.lines?.length ? data.lines : originalLines)
      setPhase('review')
    } catch { setRefined(originalLines); setPhase('review') }
  }

  const updateLine = (i: number, text: string) =>
    setRefined(prev => prev.map((l, j) => j === i ? { ...l, text } : l))

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px', maxWidth:480, width:'100%', margin:'0 auto', gap:16, overflowY:'auto' }}>
      <div style={{ fontSize:11, color:'var(--accent2)', letterSpacing:'0.08em' }}>{partLabel} · 實測分析</div>

      {phase === 'capture' && (
        <>
          <h2 className="garamond" style={{ fontSize:24, fontWeight:400 }}>影張相，AI 調整劇本</h2>
          <p style={{ fontSize:13, color:'var(--ink3)', lineHeight:1.6 }}>影一張實測嘅相 → AI 識別 → 問你幾條問題 → 根據答案重新寫稿 → 你確認 → 先開始拍片</p>
          {error && <div style={{ fontSize:13, color:'#E24B4A' }}>{error}</div>}
          <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }}
            onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]) }} />
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:'auto' }}>
            <button onClick={() => inputRef.current?.click()} style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'16px', fontSize:15, fontWeight:500, color:'#fff', cursor:'pointer' }}>📷 影相分析</button>
            <button onClick={onSkip} style={{ width:'100%', background:'none', border:'1px solid var(--border)', borderRadius:'var(--pill)', padding:'13px', fontSize:13, color:'var(--ink3)', cursor:'pointer' }}>跳過，直接拍片</button>
          </div>
        </>
      )}

      {phase === 'analyzing' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
          {preview && <img src={preview} style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:'var(--r)' }} />}
          <Spinner />
          <p style={{ color:'var(--ink3)', fontSize:13 }}>AI 分析緊相片…</p>
        </div>
      )}

      {phase === 'questions' && analysis && (
        <>
          {preview && <img src={preview} style={{ width:'100%', maxHeight:110, objectFit:'cover', borderRadius:'var(--r)' }} />}
          <div style={{ background:'var(--bg2)', border:'1px solid rgba(29,185,84,0.3)', borderRadius:'var(--rs)', padding:'10px 14px' }}>
            <div style={{ fontSize:11, color:'var(--green)', marginBottom:3 }}>AI 識別到</div>
            <div style={{ fontSize:14, color:'var(--ink)' }}>{analysis.subject}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {analysis.questions.map(q => (
              <div key={q.id}>
                <div style={{ fontSize:13, color:'var(--ink)', marginBottom:8, lineHeight:1.5 }}>{q.text}</div>
                {q.type === 'rating' && (
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setAnswers(a => ({ ...a, [q.id]: String(n) }))}
                        style={{ width:34, height:34, borderRadius:8, border:`1px solid ${answers[q.id]===String(n)?'var(--accent)':'var(--border)'}`, background:answers[q.id]===String(n)?'var(--accent)':'var(--bg2)', color:answers[q.id]===String(n)?'#fff':'var(--ink3)', fontSize:12, cursor:'pointer' }}>{n}</button>
                    ))}
                  </div>
                )}
                {q.type === 'yesno' && (
                  <div style={{ display:'flex', gap:8 }}>
                    {['係','唔係','一般'].map(v => (
                      <button key={v} onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                        style={{ flex:1, padding:'10px', borderRadius:'var(--pill)', border:`1px solid ${answers[q.id]===v?'var(--accent)':'var(--border)'}`, background:answers[q.id]===v?'var(--accent)':'var(--bg2)', color:answers[q.id]===v?'#fff':'var(--ink)', fontSize:13, cursor:'pointer' }}>{v}</button>
                    ))}
                  </div>
                )}
                {q.type === 'text' && (
                  <input value={answers[q.id]||''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="輸入你嘅答案…" style={{ fontSize:13, padding:'10px 14px' }} />
                )}
              </div>
            ))}
          </div>
          <button onClick={submitAnswers} style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'15px', fontSize:14, fontWeight:500, color:'#fff', cursor:'pointer' }}>
            AI 根據答案重新寫稿 →
          </button>
        </>
      )}

      {phase === 'refining' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
          <Spinner />
          <p style={{ color:'var(--ink3)', fontSize:13 }}>根據你嘅答案調整緊劇本…</p>
        </div>
      )}

      {phase === 'review' && refinedLines.length > 0 && (
        <>
          <div>
            <h2 className="garamond" style={{ fontSize:22, fontWeight:400, marginBottom:6 }}>調整後嘅稿</h2>
            <p style={{ fontSize:13, color:'var(--ink3)' }}>根據你嘅真實答案重新生成，可以直接編輯</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {refinedLines.map((line, i) => (
              <div key={i}>
                {editIdx === i ? (
                  <div style={{ background:'var(--bg2)', border:'1px solid var(--accent)', borderRadius:'var(--r)', padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'var(--accent2)', marginBottom:8 }}>{line.shot}</div>
                    <textarea value={line.text} onChange={e => updateLine(i, e.target.value)} autoFocus
                      style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:14, color:'var(--ink)', lineHeight:1.7, resize:'vertical', minHeight:60, fontFamily:'Inter, sans-serif' }} />
                    <button onClick={() => setEditIdx(null)} style={{ marginTop:8, background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>完成</button>
                  </div>
                ) : (
                  <button onClick={() => setEditIdx(i)} style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 14px', textAlign:'left', cursor:'pointer' }}>
                    <div style={{ fontSize:10, color:'var(--accent2)', marginBottom:4 }}>{line.shot}</div>
                    <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.7 }}>{line.text}</div>
                    {line.visual && <div style={{ fontSize:11, color:'var(--ink3)', marginTop:4 }}>{line.visual}</div>}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => onComplete(refinedLines)} style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'15px', fontSize:14, fontWeight:500, color:'#fff', cursor:'pointer' }}>
            確認，開始拍攝 →
          </button>
        </>
      )}
    </div>
  )
}

// ── Camera Page ──
export default function CameraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params)
  const router  = useRouter()

  const [project, setProject]       = useState<Project | null>(null)
  const [partIdx, setPartIdx]       = useState(0)
  const [lineIdx, setLineIdx]       = useState(0)
  const [camState, setCamState]     = useState<'photo-analysis'|'preview'|'recording'|'review'>('preview')
  const [elapsed, setElapsed]       = useState(0)
  const [camError, setCamError]     = useState('')
  const [facingMode, setFacingMode] = useState<'environment'|'user'>('environment')
  const [torchOn, setTorchOn]       = useState(false)
  const [currentLines, setCurrentLines] = useState<ScriptLine[]>([])

  const blobRef   = useRef<Blob | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const reviewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('soon-projects')
      if (raw) {
        const p = JSON.parse(raw).find((x: Project) => x.id === id)
        if (p) {
          setProject(p)
          const next = p.script.findIndex((s: ScriptPart) => s.status === 'pending')
          if (next >= 0) {
            setPartIdx(next)
            const lines = (p.script[next] as any)?.lines || []
            setCurrentLines(lines)
            setCamState(p.script[next]?.type === 'test' ? 'photo-analysis' : 'preview')
          }
        }
      }
    } catch {}
  }, [id])

  const saveScript = (script: ScriptPart[]) => {
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs: Project[] = JSON.parse(raw)
      const allDone = script.every(s => s.status !== 'pending')
      localStorage.setItem('soon-projects', JSON.stringify(
        projs.map(p => p.id === id ? { ...p, script, status: allDone ? 'done' : 'filming', updated_at: new Date().toISOString() } : p)
      ))
    } catch {}
  }

  const startCamera = useCallback(async (facing: 'environment'|'user' = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play() }
      setCamError('')
    } catch { setCamError('無法開啟鏡頭，請允許相機權限') }
  }, [facingMode])

  useEffect(() => {
    if (camState === 'preview') startCamera()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [camState])

  useEffect(() => {
    if (camState === 'review' && blobRef.current && reviewRef.current) {
      const url = URL.createObjectURL(blobRef.current)
      reviewRef.current.src = url; reviewRef.current.load(); reviewRef.current.play().catch(() => {})
    }
  }, [camState])

  const flipCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next); await startCamera(next)
  }
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try { await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] }); setTorchOn(t => !t) } catch {}
  }

  const startRec = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mime = getMimeType()
    const mr   = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      blobRef.current = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/mp4' })
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCamState('review')
    }
    mr.start(); mediaRef.current = mr; setCamState('recording'); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
  }
  const stopRec = () => { mediaRef.current?.stop(); if (timerRef.current) clearInterval(timerRef.current) }
  const retake  = async () => { blobRef.current = null; setCamState('preview'); setElapsed(0); if (reviewRef.current) { reviewRef.current.src = '' } }

  const currentPart = project?.script[partIdx]
  const currentLine = currentLines.length > 0 ? currentLines[lineIdx] : null
  const filmed = project?.script.filter(p => p.status === 'filmed').length || 0
  const total  = project?.script.length || 0

  const goNextPart = (script: ScriptPart[]) => {
    const next = script.findIndex((s, i) => i > partIdx && s.status === 'pending')
    if (next >= 0) {
      setPartIdx(next); setLineIdx(0)
      const lines = (script[next] as any)?.lines || []
      setCurrentLines(lines)
      setCamState(script[next]?.type === 'test' ? 'photo-analysis' : 'preview')
      blobRef.current = null
    } else router.push('/')
  }

  const advanceLine = (recorded: boolean) => {
    const nextLine = lineIdx + 1
    if (currentLines.length > 0 && nextLine < currentLines.length) {
      setLineIdx(nextLine); setCamState('preview'); blobRef.current = null
      if (reviewRef.current) reviewRef.current.src = ''
    } else {
      if (!project) return
      const newScript = project.script.map((p, i) =>
        i === partIdx ? { ...p, status: recorded ? 'filmed' as const : 'skipped' as const, videoSavedAt: new Date().toISOString() } : p
      )
      setProject({ ...project, script: newScript }); saveScript(newScript)
      goNextPart(newScript)
    }
  }

  const skipPart = () => {
    if (!project) return
    const newScript = project.script.map((p, i) => i === partIdx ? { ...p, status: 'skipped' as const } : p)
    setProject({ ...project, script: newScript }); saveScript(newScript)
    goNextPart(newScript)
  }

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  if (!project) return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'var(--ink3)', fontSize:14 }}>載入中…</div>
    </main>
  )

  const ProgressBar = () => (
    <div style={{ display:'flex', gap:4 }}>
      {project.script.map((p, i) => (
        <div key={p.id} style={{ height:6, borderRadius:3, transition:'all 0.3s', width: i===partIdx ? 20 : 6,
          background: p.status==='filmed' ? 'var(--green)' : p.status==='skipped' ? 'rgba(255,255,255,0.2)' : i===partIdx ? (camState==='photo-analysis'?'var(--accent)':'#fff') : 'rgba(255,255,255,0.15)' }} />
      ))}
    </div>
  )

  // ── Photo Analysis Screen ──
  if (camState === 'photo-analysis') return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'var(--ink3)', cursor:'pointer', fontSize:13 }}>← 返回</button>
        <ProgressBar />
        <span style={{ fontSize:11, color:'var(--ink3)' }}>{filmed}/{total}</span>
      </div>
      <PhotoAnalysis
        partLabel={currentPart?.label || '實測'}
        category={currentPart?.type || 'test'}
        originalLines={currentLines}
        onComplete={refinedLines => { setCurrentLines(refinedLines); if (project) { const ns = project.script.map((p, i) => i === partIdx ? { ...p, lines: refinedLines, content: refinedLines.map((l: any) => l.text).join('。') } : p); setProject({ ...project, script: ns }); saveScript(ns); } setCamState('preview') }}
        onSkip={() => setCamState('preview')}
      />
    </main>
  )

  // ── Camera Screen ──
  return (
    <main style={{ minHeight:'100dvh', background:'#000', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.7)', position:'absolute', top:0, left:0, right:0, zIndex:10 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13 }}>← 返回</button>
        <ProgressBar />
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{filmed}/{total}</span>
      </div>

      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        {camState !== 'review' && <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} playsInline muted />}
        {camState === 'review' && <video ref={reviewRef} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} playsInline controls autoPlay loop />}
        {camState !== 'review' && (
          <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', pointerEvents:'none' }}>
            {[...Array(9)].map((_,i) => <div key={i} style={{ border:'0.5px solid rgba(255,255,255,0.1)' }} />)}
          </div>
        )}
        {camState !== 'review' && currentPart && (
          <div style={{ position:'absolute', bottom:130, left:16, right:16 }}>
            {currentLines.length > 1 && (
              <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                {currentLines.map((_,li) => <div key={li} style={{ flex:1, height:2, borderRadius:1, background: li<lineIdx?'var(--green)':li===lineIdx?'#fff':'rgba(255,255,255,0.2)' }} />)}
              </div>
            )}
            <div style={{ background:'rgba(0,0,0,0.78)', borderRadius:14, padding:'14px 16px', backdropFilter:'blur(6px)' }}>
              <div style={{ fontSize:10, color:'var(--accent2)', fontWeight:600, letterSpacing:'0.08em', marginBottom:4 }}>{currentLine?.shot || currentPart.shotType}</div>
              {(currentLine?.visual || currentPart.shotNote) && <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:6, lineHeight:1.5 }}>{currentLine?.visual || currentPart.shotNote}</div>}
              <div style={{ fontSize:16, color:'#fff', lineHeight:1.65 }}>{currentLine?.text || currentPart.content}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:8 }}>{currentPart.label}{currentLines.length>1?` · ${lineIdx+1}/${currentLines.length}`:''}</div>
            </div>
          </div>
        )}
        {camState === 'recording' && (
          <div style={{ position:'absolute', top:56, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.55)', borderRadius:20, padding:'5px 12px' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#E24B4A', animation:'pulse 1s infinite' }} />
            <span style={{ fontSize:13, color:'#fff', fontVariantNumeric:'tabular-nums' }}>{fmt(elapsed)}</span>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          </div>
        )}
        {camState === 'preview' && (
          <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={flipCamera} style={{ width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>⇄</button>
            <button onClick={toggleTorch} style={{ width:40, height:40, borderRadius:'50%', background:torchOn?'rgba(255,220,0,0.6)':'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>☀</button>
          </div>
        )}
      </div>

      <div style={{ background:'rgba(0,0,0,0.88)', padding:'14px 24px 36px' }}>
        {camError && <div style={{ fontSize:12, color:'#E24B4A', textAlign:'center', marginBottom:10 }}>{camError}</div>}
        {camState === 'preview' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={skipPart} style={{ background:'none', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'var(--pill)', padding:'10px 18px', fontSize:13, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>跳過</button>
            <button onClick={startRec} style={{ width:72, height:72, borderRadius:'50%', border:'3px solid #fff', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background:'#E24B4A' }} />
            </button>
            <div style={{ width:70 }} />
          </div>
        )}
        {camState === 'recording' && (
          <div style={{ display:'flex', justifyContent:'center' }}>
            <button onClick={stopRec} style={{ width:72, height:72, borderRadius:'50%', border:'3px solid #fff', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:28, height:28, borderRadius:5, background:'#fff' }} />
            </button>
          </div>
        )}
        {camState === 'review' && (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={retake} style={{ flex:1, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'var(--pill)', padding:'15px', fontSize:14, color:'#fff', cursor:'pointer' }}>重拍</button>
            <button onClick={() => advanceLine(true)} style={{ flex:2, background:'var(--accent)', border:'none', borderRadius:'var(--pill)', padding:'15px', fontSize:14, fontWeight:600, color:'#fff', cursor:'pointer' }}>
              確認 {currentLines.length>1 && lineIdx<currentLines.length-1 ? '→ 下一句' : '✓'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
