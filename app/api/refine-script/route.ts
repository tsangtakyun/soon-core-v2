import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  try {
    const { originalLines, subject, answers, questions, partLabel } = await request.json()

    const qaText = questions.map((q: any) => {
      const ans = answers[q.id]
      return ans ? `問：${q.text}\n答：${ans}` : null
    }).filter(Boolean).join('\n\n')

    const originalText = originalLines.map((l: any) => l.text).join('。')

    const prompt = `你係 SOON Core AI。用家正在拍攝「${partLabel}」，佢做完實測之後提供咗以下真實資料：

識別到：${subject}

用家真實答案：
${qaText}

原本 AI 生成嘅劇本：
${originalText}

請根據用家嘅真實答案，重新寫一份更準確、更真實嘅「${partLabel}」劇本。

要求：
1. 直接用用家嘅真實感受同分數
2. 廣東話口語，有個性，唔oversell
3. 如果評分低，要誠實反映，唔好強行正面
4. 保持原本嘅句數（${originalLines.length} 句）
5. 每句提供 shot type 同 visual 描述

輸出 JSON（唔好加其他文字）：
{
  "lines": [
    { "text": "對白", "shot": "Medium Shot", "visual": "畫面描述" }
  ]
}`

    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data   = await res.json()
    const parsed = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
