import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const name    = request.nextUrl.searchParams.get('name')
  const address = request.nextUrl.searchParams.get('address')
  const key     = process.env.GOOGLE_PLACES_API_KEY

  if (!key || !name) return NextResponse.json({ details: null })

  try {
    // Step 1: Find Place — get place_id
    const searchRes  = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(`${name} ${address || ''}`)}` +
      `&inputtype=textquery` +
      `&fields=place_id,name,rating,user_ratings_total` +
      `&key=${key}&language=zh-TW`
    )
    const searchData = await searchRes.json()
    const candidate  = searchData.candidates?.[0]
    if (!candidate?.place_id) return NextResponse.json({ details: null })

    // Step 2: Place Details — get reviews, rating, types
    const detailRes  = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${candidate.place_id}` +
      `&fields=name,rating,user_ratings_total,reviews,types,price_level,editorial_summary,opening_hours` +
      `&key=${key}&language=zh-TW`
    )
    const detailData = await detailRes.json()
    const place      = detailData.result

    if (!place) return NextResponse.json({ details: null })

    // Extract top 3 reviews (most relevant)
    const reviews = (place.reviews || []).slice(0, 3).map((r: any) => ({
      rating: r.rating,
      text:   r.text?.slice(0, 150) || '',
      time:   r.relative_time_description,
    }))

    return NextResponse.json({
      details: {
        name:             place.name,
        rating:           place.rating,
        totalRatings:     place.user_ratings_total,
        priceLevel:       place.price_level,
        types:            place.types || [],
        editorialSummary: place.editorial_summary?.overview || '',
        reviews,
        isOpen:           place.opening_hours?.open_now,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ details: null })
  }
}
