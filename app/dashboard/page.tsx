import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sessions }, { data: characters }] = await Promise.all([
    supabase.from('sessions').select('*').eq('master_id', user.id).order('created_at', { ascending: false }),
    supabase.from('characters').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return <DashboardClient sessions={sessions ?? []} characters={characters ?? []} userId={user.id} />
}
