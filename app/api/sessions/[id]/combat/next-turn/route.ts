import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: session } = await supabase.from('sessions').select('master_id').eq('id', id).single()
  if (!session || session.master_id !== user.id) return NextResponse.json({ error: 'Только мастер' }, { status: 403 })

  const { data: combat } = await supabase.from('combat_state').select('*').eq('session_id', id).single()
  if (!combat?.is_active) return NextResponse.json({ error: 'Бой не активен' }, { status: 404 })

  const { data: participants } = await supabase.from('combat_participants')
    .select('*').eq('session_id', id).eq('is_defeated', false).order('sort_order')

  if (!participants?.length) return NextResponse.json({ error: 'Нет участников' }, { status: 400 })

  let nextTurn = combat.current_turn + 1
  let nextRound = combat.round

  if (nextTurn >= participants.length) {
    nextTurn = 0
    nextRound = combat.round + 1
  }

  const { data: updated } = await supabase.from('combat_state')
    .update({ current_turn: nextTurn, round: nextRound }).eq('session_id', id).select().single()

  return NextResponse.json({ current_turn: nextTurn, round: nextRound, current_participant: participants[nextTurn], combat_state: updated })
}
