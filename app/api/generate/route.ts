import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function fetchVoiceSamples(category: string): Promise<Record<string, string[]>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!  // service key — server only, never exposed
    )
    const { data } = await supabase
      .from('voice_samples')
      .select('part_type, text')
      .in('category', [category, 'general'])
      .eq('active', true)
      .order('part_type')

    const grouped: Record<string, string[]> = {}
    for (const row of (data || [])) {
      if (!grouped[row.part_type]) grouped[row.part_type] = []
      if (grouped[row.part_type].length < 3) grouped[row.part_type].push(row.text)
    }
    return grouped
  } catch { return {} }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  try {
    const body = await request.json()

    // If request includes category, inject voice samples into messages
    if (body._category && body.messages?.length) {
      const samples  = await fetchVoiceSamples(body._category)
      const hooks    = (samples.hook    || []).map((t: string) => '「' + t + '」').join('\n')
      const tests    = (samples.test    || []).map((t: string) => '「' + t + '」').join('\n')
      const endings  = (samples.ending  || []).map((t: string) => '「' + t + '」').join('\n')

      if (hooks || tests || endings) {
        const samplesBlock = `\n【SOON 語氣樣本 — 從真實劇本提煉，必須模仿】\n開場例子：\n${hooks}\n\n實測例子：\n${tests}\n\n結尾例子：\n${endings}\n`
        // Inject into the last user message
        const msgs = [...body.messages]
        const last = msgs[msgs.length - 1]
        if (last?.role === 'user' && typeof last.content === 'string') {
          msgs[msgs.length - 1] = { ...last, content: samplesBlock + last.content }
        }
        body.messages = msgs
      }
      delete body._category
    }

    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
