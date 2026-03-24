import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const type = url.searchParams.get('type')
  const size = url.searchParams.get('size')
  const cr_min = parseFloat(url.searchParams.get('cr_min') ?? '0')
  const cr_max = parseFloat(url.searchParams.get('cr_max') ?? '30')
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
  const from = (page - 1) * limit

  let query = supabase.from('bestiary').select('*', { count: 'exact' })
    .eq('is_homebrew', false)
    .gte('cr', cr_min).lte('cr', cr_max)
    .range(from, from + limit - 1)
    .order('cr').order('name')

  if (search) query = query.textSearch('search_vector', search)
  if (type) query = query.eq('type', type)
  if (size) query = query.eq('size', size)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ creatures: data, total: count, page, limit })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase.from('bestiary')
    .insert({ ...body, is_homebrew: true, created_by: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ creature: data }, { status: 201 })
}
