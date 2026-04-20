import type { Duration, ScriptPart } from './types'

// Shot types from soon-storyboard
export const SHOT_TYPES = {
  wide:     { name: 'Wide Shot',    note: '交代環境，帶出場景全貌' },
  medium:   { name: 'Medium Shot',  note: '主持半身，自然對話感' },
  close:    { name: 'Close-up',     note: '表情特寫，情感衝擊' },
  product:  { name: '產品特寫',      note: '近鏡拍攝食物／產品質感' },
  reaction: { name: '反應鏡頭',      note: '主持試食後真實反應' },
  overhead: { name: '俯拍',          note: '由上方拍攝，適合食物展示' },
  follow:   { name: '手持跟拍',      note: '跟住主持移動，動感十足' },
  broll:    { name: 'B-roll',       note: '環境補充畫面，配合旁白' },
}

// Duration → script structure
export const DURATION_STRUCTURE: Record<Duration, {
  parts: { type: ScriptPart['type']; label: string; count: number; durationSec: number; shotType: string }[]
}> = {
  30: {
    parts: [
      { type: 'hook',    label: 'Hook',    count: 1, durationSec: 5,  shotType: 'medium' },
      { type: 'test',    label: '實測 1',  count: 1, durationSec: 10, shotType: 'product' },
      { type: 'test',    label: '實測 2',  count: 1, durationSec: 10, shotType: 'reaction' },
      { type: 'ending',  label: 'Ending',  count: 1, durationSec: 5,  shotType: 'medium' },
    ],
  },
  60: {
    parts: [
      { type: 'hook',       label: 'Hook',       count: 1, durationSec: 5,  shotType: 'wide' },
      { type: 'background', label: '背景介紹',    count: 1, durationSec: 10, shotType: 'broll' },
      { type: 'test',       label: '實測 1',     count: 1, durationSec: 12, shotType: 'product' },
      { type: 'test',       label: '實測 2',     count: 1, durationSec: 12, shotType: 'reaction' },
      { type: 'test',       label: '實測 3',     count: 1, durationSec: 12, shotType: 'overhead' },
      { type: 'ending',     label: 'Ending',     count: 1, durationSec: 5,  shotType: 'medium' },
    ],
  },
  90: {
    parts: [
      { type: 'hook',       label: 'Hook',       count: 1, durationSec: 5,  shotType: 'wide' },
      { type: 'background', label: '背景介紹',    count: 1, durationSec: 20, shotType: 'broll' },
      { type: 'test',       label: '實測 1',     count: 1, durationSec: 20, shotType: 'product' },
      { type: 'test',       label: '實測 2',     count: 1, durationSec: 20, shotType: 'reaction' },
      { type: 'test',       label: '實測 3',     count: 1, durationSec: 20, shotType: 'follow' },
      { type: 'ending',     label: 'Ending',     count: 1, durationSec: 5,  shotType: 'medium' },
    ],
  },
}
