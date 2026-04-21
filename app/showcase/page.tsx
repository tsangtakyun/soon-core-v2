'use client'
import { useRouter } from 'next/navigation'

const CREATORS = [
  {
    id: '1', name: 'Panda', handle: '@panda_creates',
    title: '河內街頭美食探索',
    result: '3.2萬觀看 · 890 likes',
    tip: '第一句 hook 要帶問題，觀眾先會想睇落去',
    category: '餐廳/食物',
  },
  {
    id: '2', name: 'Mia', handle: '@mia_vietnam',
    title: '巴特莊陶瓷村體驗',
    result: '1.8萬觀看 · 650 likes',
    tip: '實測部分要有真實反應，唔好表演，觀眾感受到',
    category: '景點/體驗',
  },
]

export default function ShowcasePage() {
  const router = useRouter()

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13 }}>← 返回</button>
        <span className="garamond" style={{ fontSize: 18 }}>Creator 案例</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, padding: '20px 20px 40px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.7 }}>
          睇下其他 Creator 用 SOON Core 拍出嚟嘅片，學習佢地嘅演繹技巧。
        </p>

        {CREATORS.map(c => (
          <div key={c.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {/* Video placeholder */}
            <div style={{ width: '100%', height: 180, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20 }}>▶</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.title}</span>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.handle}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent2)', background: 'rgba(77,107,254,0.12)', padding: '2px 8px', borderRadius: 'var(--pill)' }}>{c.category}</span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--green)' }}>{c.result}</div>

              {/* Creator tip */}
              <div style={{ background: 'var(--bg3)', borderRadius: 'var(--rs)', padding: '10px 12px', borderLeft: '2px solid var(--accent)' }}>
                <div style={{ fontSize: 10, color: 'var(--accent2)', marginBottom: 4, letterSpacing: '0.08em' }}>CREATOR TIP</div>
                <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, fontStyle: 'italic' }}>「{c.tip}」</div>
              </div>
            </div>
          </div>
        ))}

        {/* Coming soon */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>更多案例即將加入</div>
        </div>
      </div>
    </main>
  )
}
