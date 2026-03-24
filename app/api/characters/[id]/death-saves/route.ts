import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({ type: z.enum(['success', 'failure']), reset: z.boolean().optional() })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 422 })

  const { data: char } = await supabase.from('characters').select('death_saves').eq('id', id).single()
  if (!char) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  let deathSaves = char.death_saves as { successes: number; failures: number }

  if (body.data.reset) {
    deathSaves = { successes: 0, failures: 0 }
  } else if (body.data.type === 'success') {
    deathSaves = { ...deathSaves, successes: Math.min(3, deathSaves.successes + 1) }
  } else {
    deathSaves = { ...deathSaves, failures: Math.min(3, deathSaves.failures + 1) }
  }

  const { data, error } = await supabase.from('characters').update({ death_saves: deathSaves }).eq('id', id).select('death_saves').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ death_saves: data.death_saves })
}
