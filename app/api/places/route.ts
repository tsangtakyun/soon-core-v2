import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat  = searchParams.get('lat')
  const lng  = searchParams.get('lng')
  const key  = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ error: 'Places API key not configured' }, { status: 500 })
  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&type=restaurant|tourist_attraction|cafe&key=${key}&language=zh-TW`
  const res  = await fetch(url)
  const data = await res.json()

  const places = (data.results || []).slice(0, 10).map((p: any) => ({
    id:       p.place_id,
    name:     p.name,
    address:  p.vicinity,
    rating:   p.rating,
    types:    p.types,
    photo:    p.photos?.[0]?.photo_reference,
  }))

  return NextResponse.json({ places })
}
