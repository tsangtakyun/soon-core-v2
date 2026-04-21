'use client'
import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, ScriptPart } from '@/lib/types'

type ScriptLine = { text: string; shot: string; visual: string }

function getMimeType() {
  const types = ['video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export default function CameraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params)
  const router  = useRouter()

  const [project, setProject]       = useState<Project | null>(null)
  const [partIdx, setPartIdx]       = useState(0)
  const [lineIdx, setLineIdx]       = useState(0)   // current line within part
  const [camState, setCamState]     = useState<'preview'|'recording'|'review'>('preview')
  const [elapsed, setElapsed]       = useState(0)
  const [camError, setCamError]     = useState('')
  const [facingMode, setFacingMode] = useState<'environment'|'user'>('environment')
  const [torchOn, setTorchOn]       = useState(false)
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
        const projs: Project[] = JSON.parse(raw)
        const p = projs.find(x => x.id === id)
        if (p) {
          setProject(p)
          const next = p.script.findIndex(s => s.status === 'pending')
          if (next >= 0) setPartIdx(next)
        }
      }
    } catch {}
  }, [id])

  const saveScript = (script: ScriptPart[]) => {
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs: Project[] = JSON.parse(raw)
      const allDone = script.every(s => s.status !== 'pending')
      const updated = projs.map(p => p.id === id
        ? { ...p, script, status: allDone ? 'done' : 'filming', updated_at: new Date().toISOString() } : p)
      localStorage.setItem('soon-projects', JSON.stringify(updated))
    } catch {}
  }

  const startCamera = useCallback(async (facing: 'environment'|'user' = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play() }
      setCamError('')
    } catch (e: any) { setCamError('無法開啟鏡頭，請允許相機權限\n' + (e.message || '')) }
  }, [facingMode])

  useEffect(() => { startCamera(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()) } }, [])

  useEffect(() => {
    if (camState === 'review' && blobRef.current && reviewRef.current) {
      const url = URL.createObjectURL(blobRef.current)
      reviewRef.current.src = url
      reviewRef.current.load()
      reviewRef.current.play().catch(() => {})
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
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/mp4' })
      blobRef.current = blob
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCamState('review')
    }
    mr.start(); mediaRef.current = mr; setCamState('recording'); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
  }

  const stopRec = () => { mediaRef.current?.stop(); if (timerRef.current) clearInterval(timerRef.current) }

  const retake = async () => {
    blobRef.current = null; setCamState('preview'); setElapsed(0)
    if (reviewRef.current) { reviewRef.current.src = ''; reviewRef.current.pause() }
    await startCamera()
  }

  const currentPart  = project?.script[partIdx]
  const lines: ScriptLine[] = (currentPart as any)?.lines || []
  const currentLine  = lines.length > 0 ? lines[lineIdx] : null
  const totalLines   = lines.length || 1
  const filmed       = project?.script.filter(p => p.status === 'filmed').length || 0
  const total        = project?.script.length || 0

  // Advance to next line, or next part if all lines done
  const advanceLine = (recorded: boolean) => {
    const nextLine = lineIdx + 1
    if (lines.length > 0 && nextLine < lines.length) {
      // More lines in this part
      setLineIdx(nextLine)
      setCamState('preview')
      blobRef.current = null
      if (reviewRef.current) { reviewRef.current.src = ''; reviewRef.current.pause() }
      startCamera()
    } else {
      // Part done — mark and move to next part
      if (!project) return
      const now = new Date().toISOString()
      const newScript = project.script.map((p, i) =>
        i === partIdx ? { ...p, status: recorded ? 'filmed' as const : 'skipped' as const, videoSavedAt: now } : p
      )
      const updated = { ...project, script: newScript }
      setProject(updated); saveScript(newScript)
      const next = newScript.findIndex((s, i) => i > partIdx && s.status === 'pending')
      if (next >= 0) {
        setPartIdx(next); setLineIdx(0); setCamState('preview')
        blobRef.current = null
        startCamera()
      } else { router.push('/') }
    }
  }

  const skipPart = () => {
    if (!project) return
    const newScript = project.script.map((p, i) =>
      i === partIdx ? { ...p, status: 'skipped' as const } : p
    )
    const updated = { ...project, script: newScript }
    setProject(updated); saveScript(newScript)
    const next = newScript.findIndex((s, i) => i > partIdx && s.status === 'pending')
    if (next >= 0) { setPartIdx(next); setLineIdx(0); setCamState('preview'); startCamera() }
    else router.push('/')
  }

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  if (!project) return (
    <main style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'var(--ink3)', fontSize:14 }}>載入中…</div>
    </main>
  )

  return (
    <main style={{ minHeight:'100dvh', background:'#000', display:'flex', flexDirection:'column' }}>

      {/* Top bar */}
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.7)', position:'absolute', top:0, left:0, right:0, zIndex:10 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13 }}>← 返回</button>
        {/* Progress dots */}
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {project.script.map((p, i) => (
            <div key={p.id} style={{ height:6, borderRadius:3, transition:'all 0.3s',
              width: i === partIdx ? (lines.length > 1 ? 28 : 20) : 6,
              background: p.status==='filmed' ? 'var(--green)' : p.status==='skipped' ? 'rgba(255,255,255,0.2)' : i===partIdx ? '#fff' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{filmed}/{total}</span>
      </div>

      {/* Camera */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        {camState !== 'review' && (
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} playsInline muted />
        )}
        {camState === 'review' && (
          <video ref={reviewRef} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} playsInline controls autoPlay loop />
        )}

        {/* Grid */}
        {camState !== 'review' && (
          <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', pointerEvents:'none' }}>
            {[...Array(9)].map((_,i) => <div key={i} style={{ border:'0.5px solid rgba(255,255,255,0.1)' }} />)}
          </div>
        )}

        {/* Script prompt — shows current line */}
        {camState !== 'review' && currentPart && (
          <div style={{ position:'absolute', bottom:130, left:16, right:16 }}>
            {/* Line progress (if multi-line part) */}
            {lines.length > 1 && (
              <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                {lines.map((_, li) => (
                  <div key={li} style={{ flex:1, height:2, borderRadius:1,
                    background: li < lineIdx ? 'var(--green)' : li === lineIdx ? '#fff' : 'rgba(255,255,255,0.2)' }} />
                ))}
              </div>
            )}
            <div style={{ background:'rgba(0,0,0,0.78)', borderRadius:14, padding:'14px 16px', backdropFilter:'blur(6px)' }}>
              {/* Shot type + visual */}
              <div style={{ marginBottom:8 }}>
                <span style={{ fontSize:10, color:'var(--accent2)', fontWeight:600, letterSpacing:'0.08em' }}>
                  {currentLine?.shot || currentPart.shotType}
                </span>
                {(currentLine?.visual || currentPart.shotNote) && (
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:3, lineHeight:1.5 }}>
                    {currentLine?.visual || currentPart.shotNote}
                  </div>
                )}
              </div>
              {/* Dialogue */}
              <div style={{ fontSize:16, color:'#fff', lineHeight:1.65, fontWeight:400 }}>
                {currentLine?.text || currentPart.content}
              </div>
              {/* Part label */}
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:8 }}>
                {currentPart.label}{lines.length > 1 ? ` · 第 ${lineIdx+1}/${lines.length} 句` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Recording timer */}
        {camState === 'recording' && (
          <div style={{ position:'absolute', top:56, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.55)', borderRadius:20, padding:'5px 12px' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#E24B4A', animation:'pulse 1s infinite' }} />
            <span style={{ fontSize:13, color:'#fff', fontVariantNumeric:'tabular-nums' }}>{fmt(elapsed)}</span>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          </div>
        )}

        {/* Flip + torch */}
        {camState === 'preview' && (
          <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={flipCamera} style={{ width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>⇄</button>
            <button onClick={toggleTorch} style={{ width:40, height:40, borderRadius:'50%', background: torchOn?'rgba(255,220,0,0.6)':'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>☀</button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{ background:'rgba(0,0,0,0.88)', padding:'14px 24px 36px' }}>
        {camError && <div style={{ fontSize:12, color:'#E24B4A', textAlign:'center', marginBottom:10, whiteSpace:'pre-line' }}>{camError}</div>}

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
              確認 {lines.length > 1 && lineIdx < lines.length - 1 ? '→ 下一句' : '✓'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
