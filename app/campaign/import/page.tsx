import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CampaignImportClient from './CampaignImportClient'

export default async function CampaignImportPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessions } = await supabase
    .from('sessions').select('id').eq('master_id', user.id).limit(1)

  if (!sessions || sessions.length === 0) redirect('/dashboard')

  return <CampaignImportClient />
}
