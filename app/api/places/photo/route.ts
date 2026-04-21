import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref')
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!ref || !key) return new NextResponse('Missing params', { status: 400 })

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${ref}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) return new NextResponse('Photo not found', { status: 404 })

  const buf = await res.arrayBuffer()
  return new NextResponse(buf, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
