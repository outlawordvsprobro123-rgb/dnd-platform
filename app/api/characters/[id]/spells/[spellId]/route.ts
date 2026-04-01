import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; spellId: string }> }) {
  const { id, spellId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = await req.json()
  const { error } = await supabase
    .from('character_spells')
    .update(body)
    .eq('id', spellId)
    .eq('character_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; spellId: string }> }) {
  const { id, spellId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { error } = await supabase
    .from('character_spells')
    .delete()
    .eq('id', spellId)
    .eq('character_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
