import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch all shared ideas (no user_id filter = public/shared ideas)
  const { data, error } = await supabase
    .from('ideas')
    .select('id, title, topic, summary, country, script_hook, tags, viral_score, lat, lng')
    .order('viral_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ideas = (data || []).map((idea: any) => {
    // Calculate distance from user if lat/lng available
    let distanceKm: number | null = null
    if (lat && lng && idea.lat && idea.lng) {
      const R  = 6371
      const dLat = (idea.lat - lat) * Math.PI / 180
      const dLng = (idea.lng - lng) * Math.PI / 180
      const a  = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(idea.lat*Math.PI/180) * Math.sin(dLng/2)**2
      distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
    }

    // Map country code to category
    const categoryMap: Record<string, string> = {
      VN: 'attraction', TW: 'food', FR: 'attraction', HK: 'food',
    }

    return {
      id:         idea.id,
      title:      idea.title,
      topic:      idea.topic,
      summary:    idea.summary,
      hook:       idea.script_hook,
      tags:       idea.tags || [],
      viralScore: idea.viral_score,
      country:    idea.country,
      distanceKm,
      category:   categoryMap[idea.country] || 'attraction',
    }
  })

  // Sort: nearby first (within 100km), then by viral score
  ideas.sort((a: any, b: any) => {
    const aNearby = a.distanceKm !== null && a.distanceKm < 100
    const bNearby = b.distanceKm !== null && b.distanceKm < 100
    if (aNearby && !bNearby) return -1
    if (!aNearby && bNearby) return 1
    return b.viralScore - a.viralScore
  })

  return NextResponse.json({ ideas })
}
