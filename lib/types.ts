export type Duration = 30 | 60 | 90

export type ScriptPart = {
  id: string
  type: 'hook' | 'background' | 'test' | 'ending'
  label: string
  content: string          // editable VO / dialogue
  shotType: string         // AI suggested shot
  shotNote: string         // brief shooting instruction
  durationSec: number      // target seconds
  status: 'pending' | 'filmed' | 'skipped'
  videoSavedAt?: string    // timestamp when user confirmed footage
}

export type Project = {
  id: string
  user_id: string
  name: string
  address: string
  duration: Duration
  script: ScriptPart[]
  status: 'draft' | 'filming' | 'done'
  created_at: string
  updated_at: string
}
