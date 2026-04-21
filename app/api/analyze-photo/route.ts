import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  try {
    const { imageBase64, mediaType, partLabel, category } = await request.json()

    const prompt = `你係一個 short video creator assistant。用家係拍攝緊一個「${partLabel}」嘅鏡頭，類別係「${category}」。

佢影咗一張相，你要：
1. 分析相中係咩（食物、景點、產品、人物等）
2. 根據分析結果，問 4-5 條最相關嘅問題幫佢完善劇本

問題類型例子：
- 食物：味道如何（1-10分）、最特別係咩、值唔值得排隊、價錢幾多、會唔會再嚟
- 景點：最震撼係咩、同預期有咩唔同、適合咩人嚟、幾星評價、有冇隱藏景點
- 產品：質素如何、最滿意係咩、有冇缺點、值唔值嗰個價、推唔推介

輸出 JSON（唔好加其他文字）：
{
  "subject": "相中主體描述（一句）",
  "category": "food / attraction / product / people",
  "questions": [
    { "id": "q1", "text": "問題（廣東話口語）", "type": "rating / text / yesno" },
    { "id": "q2", "text": "問題", "type": "text" },
    { "id": "q3", "text": "問題", "type": "rating" },
    { "id": "q4", "text": "問題", "type": "text" },
    { "id": "q5", "text": "問題", "type": "yesno" }
  ]
}`

    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      }),
    })
    const data = await res.json()
    const parsed = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
