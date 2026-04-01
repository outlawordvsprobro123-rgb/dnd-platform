import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  // Verify ownership
  const { data: char } = await supabase.from('characters').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!char) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Нет файла' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${user.id}/${id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('characters')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('characters')
    .update({ avatar_url: publicUrl })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ avatar_url: publicUrl })
}
