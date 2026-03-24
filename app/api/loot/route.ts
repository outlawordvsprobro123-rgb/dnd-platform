import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const type = url.searchParams.get('type')
  const rarity = url.searchParams.get('rarity')
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
  const from = (page - 1) * limit

  let query = supabase.from('loot_items').select('*', { count: 'exact' })
    .eq('is_homebrew', false).range(from, from + limit - 1).order('name')

  if (search) query = query.textSearch('search_vector', search)
  if (type) query = query.eq('type', type)
  if (rarity) query = query.eq('rarity', rarity)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data, total: count, page, limit })
}
