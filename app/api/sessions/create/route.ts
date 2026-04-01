import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1).max(100) })

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)]
  code += '-'
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  // Генерация уникального кода (до 5 попыток)
  let code = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode()
    const { data: existing } = await supabase.from('sessions').select('id').eq('code', candidate).single()
    if (!existing) { code = candidate; break }
  }
  if (!code) return NextResponse.json({ error: 'Не удалось создать код сессии' }, { status: 500 })

  const { data, error } = await supabase.from('sessions')
    .insert({ name: body.data.name, code, master_id: user.id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Инициализируем состояние карты и тумана
  await Promise.all([
    supabase.from('map_state').insert({ session_id: data.id }),
    supabase.from('fog_state').insert({ session_id: data.id, fog_enabled: false, revealed_zones: [] }),
  ])

  return NextResponse.json({ session: data }, { status: 201 })
}
