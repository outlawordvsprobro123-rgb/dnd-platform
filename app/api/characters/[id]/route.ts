import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: character, error } = await supabase.from('characters').select('*').eq('id', id).single()
  if (error || !character) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const [{ data: inventory }, { data: spells }, { data: spell_slots }] = await Promise.all([
    supabase.from('character_inventory').select('*').eq('character_id', id),
    supabase.from('character_spells').select('*').eq('character_id', id),
    supabase.from('spell_slots').select('*').eq('character_id', id).order('level'),
  ])

  return NextResponse.json({ character, inventory: inventory ?? [], spells: spells ?? [], spell_slots: spell_slots ?? [] })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = await req.json()
  // Запрещаем прямое изменение hp через этот эндпойнт
  delete body.hp_current
  delete body.user_id
  delete body.id

  const { data, error } = await supabase.from('characters').update(body).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Не найдено или нет доступа' }, { status: 404 })
  return NextResponse.json({ character: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { error } = await supabase.from('characters').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
