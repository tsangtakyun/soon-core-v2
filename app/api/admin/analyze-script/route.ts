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

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  try {
    const formData  = await request.formData()
    const adminKey  = formData.get('adminKey') as string
    const file      = formData.get('file') as File

    if (adminKey !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Extract text from docx using mammoth via base64
    const arrayBuffer = await file.arrayBuffer()
    const base64      = Buffer.from(arrayBuffer).toString('base64')

    // Use Claude to both extract text and analyze voice samples in one shot
    const prompt = `你係 SOON Core AI 嘅 Voice Sample 分析員。

以下係一份 SOON IG Reel 劇本（base64 encoded docx，你唔需要decode，我已經幫你提取咗文字放喺下面）。

請分析呢份劇本，提煉出最有代表性嘅句子做語氣樣本。

判斷標準：
- 開場（hook）：有懷疑、挑戰、反差嘅句子
- 實測（test）：有真實感受、生動比喻、具體描述嘅句子
- 結尾（ending）：有個人立場、真實總結、call to action嘅句子
- 唔要：純描述性、太書面、太平淡嘅句子

同時判斷呢份劇本係咩類別：food / attraction / product / vlog / people

輸出 JSON（唔好加其他文字）：
{
  "title": "劇本標題（一句）",
  "category": "food / attraction / product / vlog / people",
  "samples": [
    { "part_type": "hook", "text": "句子" },
    { "part_type": "test", "text": "句子" },
    { "part_type": "ending", "text": "句子" }
  ]
}`

    // First extract text from docx server-side using a simple approach
    // We'll use Claude vision to read the file content
    const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: base64 }
            },
            { type: 'text', text: prompt }
          ]
        }]
      }),
    })

    const extractData = await extractRes.json()
    const text        = extractData.content?.[0]?.text || '{}'
    const parsed      = JSON.parse(text.replace(/```json|```/g, '').trim())

    return NextResponse.json({
      title:    parsed.title    || file.name,
      category: parsed.category || 'general',
      samples:  parsed.samples  || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
