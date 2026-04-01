import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  character_id: z.string().uuid(),
  item_id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  weight: z.number().default(0),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .from('character_inventory')
    .insert({
      character_id: body.data.character_id,
      item_id: body.data.item_id ?? null,
      name: body.data.name,
      description: body.data.description ?? null,
      quantity: body.data.quantity,
      weight: body.data.weight,
      equipped: false,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
