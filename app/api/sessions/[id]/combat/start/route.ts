import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const participantSchema = z.object({
  token_id: z.string().uuid(),
  name: z.string(),
  initiative: z.number().int(),
  hp_max: z.number().int(),
  hp_current: z.number().int(),
  ac: z.number().int().default(10),
  is_player: z.boolean().default(false),
})
const schema = z.object({ participants: z.array(participantSchema).min(2) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: session } = await supabase.from('sessions').select('master_id').eq('id', id).single()
  if (!session || session.master_id !== user.id) return NextResponse.json({ error: 'Только мастер' }, { status: 403 })

  const { data: existing } = await supabase.from('combat_state').select('is_active').eq('session_id', id).single()
  if (existing?.is_active) return NextResponse.json({ error: 'Бой уже идёт' }, { status: 409 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Нужно минимум 2 участника' }, { status: 422 })

  // Сортируем по инициативе
  const sorted = body.data.participants
    .sort((a, b) => b.initiative - a.initiative)
    .map((p, i) => ({ ...p, session_id: id, sort_order: i }))

  await supabase.from('combat_participants').delete().eq('session_id', id)
  const { data: participants, error: pErr } = await supabase.from('combat_participants').insert(sorted).select()
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { data: combat, error } = await supabase.from('combat_state')
    .upsert({ session_id: id, is_active: true, round: 1, current_turn: 0 }, { onConflict: 'session_id' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ combat_state: combat, participants }, { status: 201 })
}
