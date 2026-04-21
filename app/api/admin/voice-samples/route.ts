import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = 'soon-admin-2025'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

// GET — list all samples (admin only)
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('adminKey') || request.headers.get('x-admin-key')
  if (key !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getServiceClient().from('voice_samples').select('*').order('category').order('part_type').order('id')
  return NextResponse.json({ samples: data || [] })
}

// POST — add sample
export async function POST(request: NextRequest) {
  const body = await request.json()
  if (body.adminKey !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await getServiceClient().from('voice_samples').insert({ category: body.category, part_type: body.part_type, text: body.text, source: body.source || null })
  if (error) return NextResponse.json({ error: error.message })
  return NextResponse.json({ ok: true })
}

// PATCH — toggle active
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  if (body.adminKey !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await getServiceClient().from('voice_samples').update({ active: body.active }).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message })
  return NextResponse.json({ ok: true })
}

// DELETE — remove sample
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  if (body.adminKey !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await getServiceClient().from('voice_samples').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message })
  return NextResponse.json({ ok: true })
}
