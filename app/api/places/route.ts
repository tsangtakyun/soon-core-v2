import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const key        = process.env.GOOGLE_PLACES_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!key) return NextResponse.json({ error: 'Places API key 未設定' }, { status: 500 })
  if (!lat || !lng) return NextResponse.json({ error: '需要提供位置' }, { status: 400 })

  try {
    const categories = [
      { type: 'restaurant',         typeLabel: '餐廳',   category: 'food' },
      { type: 'tourist_attraction', typeLabel: '景點',   category: 'attraction' },
      { type: 'cafe',               typeLabel: '咖啡店', category: 'food' },
      { type: 'museum',             typeLabel: '博物館', category: 'attraction' },
      { type: 'store',              typeLabel: '商店',   category: 'product' },
    ]

    const fetchCat = async (type: string) => {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}&radius=5000&type=${type}&key=${key}&language=zh-TW`
      const res  = await fetch(url)
      const data = await res.json()
      if (data.status === 'REQUEST_DENIED') throw new Error('API key 無效或未啟用 Places API')
      return (data.results || []) as any[]
    }

    // Fetch all 5 categories in parallel
    const results = await Promise.allSettled(categories.map(c => fetchCat(c.type)))

    const seen   = new Set<string>()
    const raw: any[] = []

    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return
      const cat = categories[i]
      result.value
        .filter((p: any) => !seen.has(p.place_id) && (p.rating >= 3.5 || !p.rating))
        .slice(0, 3)
        .forEach((p: any) => {
          seen.add(p.place_id)
          raw.push({
            id:        p.place_id,
            name:      p.name,
            address:   p.vicinity,
            rating:    p.rating || 0,
            userRatingsTotal: p.user_ratings_total || 0,
            types:     p.types || [],
            category:  cat.category,
            typeLabel: cat.typeLabel,
            photo:     p.photos?.[0]?.photo_reference || null,
          })
        })
    })

    // ── AI scoring ──
    if (anthropicKey && raw.length > 0) {
      try {
        const placeList = raw.map((p, i) =>
          `${i+1}. ${p.name}（${p.typeLabel}）— Google評分：${p.rating}，評論數：${p.userRatingsTotal}，地址：${p.address}`
        ).join('\n')

        const prompt = `你係一個香港 short video creator，幫我評估以下地點嘅「拍攝潛力」。

地點列表：
${placeList}

評估標準（各佔25分，總分100）：
- 視覺衝擊力：環境好唔好睇、有冇特色畫面
- 故事性：有冇背景、歷史、人物故事可以講
- 獨特性：係咪罕見、有冇獨特 hook
- Creator 友好度：容唔容易拍、適唔適合短片

輸出 JSON（唔好加其他文字）：
[
  { "index": 1, "score": 85, "reason": "一句廣東話講點解值得拍" },
  { "index": 2, "score": 60, "reason": "一句廣東話講點解值得拍" }
]`

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        const aiData = await aiRes.json()
        const text   = aiData.content?.[0]?.text || '[]'
        const scores: { index: number; score: number; reason: string }[] =
          JSON.parse(text.replace(/```json|```/g, '').trim())

        // Merge scores into places
        scores.forEach(s => {
          const p = raw[s.index - 1]
          if (p) { p.filmScore = s.score; p.filmReason = s.reason }
        })

        // Sort by filmScore desc
        raw.sort((a, b) => (b.filmScore || 0) - (a.filmScore || 0))
      } catch (e) {
        // AI scoring failed — fallback to Google rating sort
        raw.sort((a, b) => b.rating - a.rating)
      }
    } else {
      raw.sort((a, b) => b.rating - a.rating)
    }

    return NextResponse.json({ places: raw })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
