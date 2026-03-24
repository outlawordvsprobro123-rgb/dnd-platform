import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tokenId: string }> }) {
  const { id, tokenId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = await req.json()
  delete body.session_id
  delete body.id

  const { data, error } = await supabase.from('map_tokens').update(body).eq('id', tokenId).eq('session_id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  return NextResponse.json({ token: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; tokenId: string }> }) {
  const { id, tokenId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: session } = await supabase.from('sessions').select('master_id').eq('id', id).single()
  if (!session || session.master_id !== user.id) return NextResponse.json({ error: 'Только мастер' }, { status: 403 })

  const { error } = await supabase.from('map_tokens').delete().eq('id', tokenId).eq('session_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
