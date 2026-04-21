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
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=800` +
      `&type=restaurant|cafe|tourist_attraction|museum|art_gallery|park|store|bakery|spa` +
      `&key=${key}` +
      `&language=zh-TW`

    const res  = await fetch(url)
    const data = await res.json()

    if (data.status === 'REQUEST_DENIED') {
      return NextResponse.json({ error: 'API key 無效或未啟用 Places API' }, { status: 403 })
    }

    const places = (data.results || [])
      .filter((p: any) => p.rating >= 3.5 || !p.rating)
      .slice(0, 12)
      .map((p: any) => ({
        id:      p.place_id,
        name:    p.name,
        address: p.vicinity,
        rating:  p.rating || 0,
        types:   p.types || [],
        photo:   p.photos?.[0]?.photo_reference || null,
      }))

    return NextResponse.json({ places })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
