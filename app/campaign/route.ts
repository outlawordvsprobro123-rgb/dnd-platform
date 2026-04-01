import { createServerClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('<h1>Доступ запрещён</h1><p>Необходима авторизация.</p>', {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('master_id', user.id)
    .limit(1)

  if (!sessions || sessions.length === 0) {
    return new Response('<h1>Доступ запрещён</h1><p>Книга кампании доступна только Мастеру.</p>', {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const html = await readFile(join(process.cwd(), 'data', 'varnthal.html'), 'utf-8')

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
