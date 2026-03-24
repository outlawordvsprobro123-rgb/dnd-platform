import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const level = url.searchParams.get('level')
  const school = url.searchParams.get('school')
  const cls = url.searchParams.get('class')
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
  const from = (page - 1) * limit

  let query = supabase.from('spells').select('*', { count: 'exact' })
    .eq('is_homebrew', false).range(from, from + limit - 1).order('level').order('name')

  if (search) query = query.textSearch('search_vector', search)
  if (level !== null) query = query.eq('level', parseInt(level))
  if (school) query = query.eq('school', school)
  if (cls) query = query.contains('classes', [cls])

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ spells: data, total: count, page, limit })
}
