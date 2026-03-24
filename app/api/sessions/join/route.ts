import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ code: z.string(), character_id: z.string().uuid().optional() })

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  const { data: session } = await supabase.from('sessions').select('*').eq('code', body.data.code.toUpperCase()).single()
  if (!session) return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 })
  if (session.status === 'ended') return NextResponse.json({ error: 'Сессия завершена' }, { status: 403 })

  // Проверяем не кикнут ли игрок
  const { data: existing } = await supabase.from('session_players')
    .select('*').eq('session_id', session.id).eq('user_id', user.id).single()
  if (existing?.status === 'kicked') return NextResponse.json({ error: 'Вы исключены из этой сессии' }, { status: 403 })

  // Обновляем или создаём запись
  const { error } = await supabase.from('session_players')
    .upsert({ session_id: session.id, user_id: user.id, character_id: body.data.character_id ?? null, status: 'online' }, { onConflict: 'session_id,user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: players } = await supabase.from('session_players').select('*').eq('session_id', session.id)
  return NextResponse.json({ session, players })
}
