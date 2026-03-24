import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ delta: z.number() })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  const { data: char } = await supabase.from('characters').select('hp_current, hp_max, hp_temp').eq('id', id).single()
  if (!char) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const newHp = Math.max(0, Math.min(char.hp_max, char.hp_current + body.data.delta))
  const { data, error } = await supabase.from('characters').update({ hp_current: newHp }).eq('id', id).select('hp_current, hp_temp').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
