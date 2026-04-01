import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const service = createServiceClient()

  // Fetch session players (service role bypasses RLS)
  const { data: players, error } = await service
    .from('session_players')
    .select('user_id, character_id')
    .eq('session_id', id)
    .neq('status', 'kicked')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const characterIds = (players ?? []).map(p => p.character_id).filter(Boolean) as string[]
  if (characterIds.length === 0) return NextResponse.json([])

  const { data: characters } = await service
    .from('characters')
    .select('id, name')
    .in('id', characterIds)

  return NextResponse.json(characters ?? [])
}
