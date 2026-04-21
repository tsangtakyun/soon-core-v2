import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const key = process.env.GOOGLE_PLACES_API_KEY

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
        `?location=${lat},${lng}&radius=1000&type=${type}&rankby=prominence&key=${key}&language=zh-TW`
      const res  = await fetch(url)
      const data = await res.json()
      if (data.status === 'REQUEST_DENIED') throw new Error('API key 無效或未啟用 Places API')
      return (data.results || []) as any[]
    }

    // Fetch all 5 categories in parallel
    const results = await Promise.allSettled(categories.map(c => fetchCat(c.type)))

    const seen   = new Set<string>()
    const places: any[] = []

    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return
      const cat = categories[i]
      result.value
        .filter((p: any) => !seen.has(p.place_id) && (p.rating >= 3.8 || !p.rating))
        .slice(0, 2)
        .forEach((p: any) => {
          seen.add(p.place_id)
          places.push({
            id:        p.place_id,
            name:      p.name,
            address:   p.vicinity,
            rating:    p.rating || 0,
            types:     p.types || [],
            category:  cat.category,
            typeLabel: cat.typeLabel,
            photo:     p.photos?.[0]?.photo_reference || null,
          })
        })
    })

    // Sort by rating descending
    places.sort((a, b) => b.rating - a.rating)

    return NextResponse.json({ places })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
