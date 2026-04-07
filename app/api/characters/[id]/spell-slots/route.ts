import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  level: z.number().int().min(1).max(9),
  total: z.number().int().min(0).max(20),
  used: z.number().int().min(0).max(20),
})

// PUT — создать или обновить ячейки заклинаний для уровня
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  // Проверяем доступ к персонажу
  const { data: char } = await supabase.from('characters').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!char) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  const { level, total, used } = body.data
  const clampedUsed = Math.min(used, total)

  const { data, error } = await supabase
    .from('spell_slots')
    .upsert({ character_id: id, level, total, used: clampedUsed }, { onConflict: 'character_id,level' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slot: data })
}

// DELETE — удалить ячейки для уровня
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: char } = await supabase.from('characters').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!char) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const level = parseInt(searchParams.get('level') ?? '')
  if (!level || level < 1 || level > 9) return NextResponse.json({ error: 'Неверный уровень' }, { status: 422 })

  const { error } = await supabase.from('spell_slots').delete().eq('character_id', id).eq('level', level)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
