import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Файл не передан' }, { status: 422 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'webp'
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  if (!allowed.includes(ext)) return NextResponse.json({ error: 'Недопустимый формат файла' }, { status: 422 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Файл слишком большой (макс. 5MB)' }, { status: 422 })

  const path = `bestiary/${id}.${ext}`
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from('images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(uploaded.path)

  const { error: dbError } = await supabase
    .from('bestiary')
    .update({ image_url: publicUrl })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ image_url: publicUrl })
}
