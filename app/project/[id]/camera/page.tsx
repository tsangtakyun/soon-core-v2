'use client'
import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, ScriptPart } from '@/lib/types'

function getMimeType() {
  const types = ['video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export default function CameraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()

  const [project, setProject]     = useState<Project | null>(null)
  const [partIdx, setPartIdx]     = useState(0)
  const [camState, setCamState]   = useState<'preview' | 'recording' | 'review'>('preview')
  const [elapsed, setElapsed]     = useState(0)
  const [camError, setCamError]   = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn]     = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  const videoRef   = useRef<HTMLVideoElement>(null)
  const reviewRef  = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const mediaRef   = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const blobRef    = useRef<Blob | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load project
  useEffect(() => {
    try {
      const raw = localStorage.getItem('soon-projects')
      if (raw) {
        const projs: Project[] = JSON.parse(raw)
        const p = projs.find(x => x.id === id)
        if (p) {
          setProject(p)
          // Resume from last unfilmed part
          const next = p.script.findIndex(s => s.status === 'pending')
          if (next >= 0) setPartIdx(next)
        }
      }
    } catch {}
  }, [id])

  const saveProjectScript = (script: ScriptPart[]) => {
    try {
      const raw   = localStorage.getItem('soon-projects') || '[]'
      const projs: Project[] = JSON.parse(raw)
      const allDone = script.every(s => s.status !== 'pending')
      const updated = projs.map(p => p.id === id ? {
        ...p, script,
        status: allDone ? 'done' : 'filming',
        updated_at: new Date().toISOString(),
      } : p)
      localStorage.setItem('soon-projects', JSON.stringify(updated))
    } catch {}
  }

  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play()
      }
      setCamError('')
    } catch (e: any) {
      setCamError('無法開啟鏡頭，請允許相機權限\n' + (e.message || ''))
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Set review video source when blob ready
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
    setFacingMode(next)
    await startCamera(next)
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(t => !t)
    } catch {}
  }

  const startRec = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mime = getMimeType()
    const mr   = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const mime2 = chunksRef.current[0]?.type || 'video/mp4'
      const blob  = new Blob(chunksRef.current, { type: mime2 })
      blobRef.current = blob
      setRecordedBlob(blob)
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCamState('review')
    }
    mr.start()
    mediaRef.current = mr
    setCamState('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
  }

  const stopRec = () => {
    mediaRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const retake = async () => {
    blobRef.current = null
    setRecordedBlob(null)
    setCamState('preview')
    setElapsed(0)
    if (reviewRef.current) { reviewRef.current.src = ''; reviewRef.current.pause() }
    await startCamera()
  }

  const confirmShot = () => {
    if (!project) return
    const now    = new Date().toISOString()
    const newScript = project.script.map((p, i) =>
      i === partIdx ? { ...p, status: 'filmed' as const, videoSavedAt: now } : p
    )
    const updatedProject = { ...project, script: newScript }
    setProject(updatedProject)
    saveProjectScript(newScript)

    const next = newScript.findIndex((s, i) => i > partIdx && s.status === 'pending')
    if (next >= 0) {
      setPartIdx(next)
      setCamState('preview')
      blobRef.current = null
      setRecordedBlob(null)
      startCamera()
    } else {
      router.push('/')
    }
  }

  const skipPart = () => {
    if (!project) return
    const newScript = project.script.map((p, i) =>
      i === partIdx ? { ...p, status: 'skipped' as const } : p
    )
    const updatedProject = { ...project, script: newScript }
    setProject(updatedProject)
    saveProjectScript(newScript)

    const next = newScript.findIndex((s, i) => i > partIdx && s.status === 'pending')
    if (next >= 0) {
      setPartIdx(next)
      setCamState('preview')
      startCamera()
    } else {
      router.push('/')
    }
  }

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const currentPart = project?.script[partIdx]
  const filmed      = project?.script.filter(p => p.status === 'filmed').length || 0
  const total       = project?.script.length || 0
  const progress    = total > 0 ? (filmed / total) * 100 : 0

  if (!project) return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--ink3)', fontSize: 14 }}>載入中…</div>
    </main>
  )

  return (
    <main style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>

        {/* Progress pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {project.script.map((p, i) => (
            <div key={p.id} style={{ width: i === partIdx ? 20 : 6, height: 6, borderRadius: 3, transition: 'all 0.3s',
              background: p.status === 'filmed' ? 'var(--green)' : p.status === 'skipped' ? 'rgba(255,255,255,0.2)' : i === partIdx ? '#fff' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>

        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{filmed}/{total}</span>
      </div>

      {/* Camera feed */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {camState !== 'review' && (
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} playsInline muted />
        )}
        {camState === 'review' && (
          <video ref={reviewRef} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} playsInline controls autoPlay loop />
        )}

        {/* Grid */}
        {camState !== 'review' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', pointerEvents: 'none' }}>
            {[...Array(9)].map((_, i) => <div key={i} style={{ border: '0.5px solid rgba(255,255,255,0.1)' }} />)}
          </div>
        )}

        {/* Script prompt box */}
        {camState !== 'review' && currentPart && (
          <div style={{ position: 'absolute', bottom: 120, left: 16, right: 16 }}>
            <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 5, letterSpacing: '0.08em' }}>
                {currentPart.label} · {currentPart.shotType} · {currentPart.durationSec}秒
              </div>
              <div style={{ fontSize: 15, color: '#fff', lineHeight: 1.6, fontWeight: 400 }}>
                {currentPart.content}
              </div>
              {currentPart.shotNote && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                  {currentPart.shotNote}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording timer */}
        {camState === 'recording' && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '5px 12px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 13, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</span>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          </div>
        )}

        {/* Camera controls */}
        {camState === 'preview' && (
          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={flipCamera} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⇄</button>
            <button onClick={toggleTorch} style={{ width: 40, height: 40, borderRadius: '50%', background: torchOn ? 'rgba(255,220,0,0.6)' : 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☀</button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{ background: 'rgba(0,0,0,0.85)', padding: '16px 24px 36px' }}>

        {camError && (
          <div style={{ fontSize: 12, color: '#E24B4A', textAlign: 'center', marginBottom: 12, whiteSpace: 'pre-line' }}>{camError}</div>
        )}

        {camState === 'preview' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={skipPart} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--pill)', padding: '10px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>跳過</button>
            <button onClick={startRec} style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #fff', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#E24B4A' }} />
            </button>
            <div style={{ width: 70 }} />
          </div>
        )}

        {camState === 'recording' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={stopRec} style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #fff', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: 5, background: '#fff' }} />
            </button>
          </div>
        )}

        {camState === 'review' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={retake} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--pill)', padding: '15px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>重拍</button>
            <button onClick={confirmShot} style={{ flex: 2, background: 'var(--accent)', border: 'none', borderRadius: 'var(--pill)', padding: '15px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>確認 ✓</button>
          </div>
        )}

      </div>
    </main>
  )
}
