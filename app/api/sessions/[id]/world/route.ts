import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  weather: z.enum(['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'heat']).optional(),
  time_of_day: z.enum(['dawn', 'day', 'dusk', 'night', 'midnight']).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: session } = await supabase.from('sessions').select('master_id').eq('id', id).single()
  if (!session) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  if (session.master_id !== user.id) return NextResponse.json({ error: 'Только мастер' }, { status: 403 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  const { data, error } = await supabase
    .from('world_state')
    .upsert({ session_id: id, ...body.data, updated_at: new Date().toISOString() }, { onConflict: 'session_id' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ world_state: data })
}
