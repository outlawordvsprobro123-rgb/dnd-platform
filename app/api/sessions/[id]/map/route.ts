import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  map_url: z.string().nullable().optional(),
  map_type: z.enum(['image', 'video', 'gif']).optional(),
  grid_type: z.enum(['square', 'hex', 'none']).optional(),
  grid_size: z.number().int().min(10).max(200).optional(),
  grid_color: z.string().optional(),
  grid_stroke_width: z.number().min(0.5).max(10).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { data: session } = await supabase.from('sessions').select('master_id').eq('id', id).single()
  if (!session || session.master_id !== user.id) return NextResponse.json({ error: 'Только мастер' }, { status: 403 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  // Try full upsert first; if grid_stroke_width column doesn't exist yet, retry without it
  let { data, error } = await supabase.from('map_state')
    .upsert({ session_id: id, ...body.data }, { onConflict: 'session_id' })
    .select().single()

  if (error && error.message.includes('grid_stroke_width')) {
    const { grid_stroke_width: _sw, ...rest } = body.data
    const retry = await supabase.from('map_state')
      .upsert({ session_id: id, ...rest }, { onConflict: 'session_id' })
      .select().single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ map_state: data })
}
