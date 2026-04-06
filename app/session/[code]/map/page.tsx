import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MapDisplay from './MapDisplay'

export default async function MapDisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: session } = await supabase.from('sessions').select('*').eq('code', code.toUpperCase()).single()
  if (!session) notFound()

  const [{ data: tokens }, { data: mapState }, { data: fogState }, { data: worldState }] = await Promise.all([
    supabase.from('map_tokens').select('*').eq('session_id', session.id),
    supabase.from('map_state').select('*').eq('session_id', session.id).single(),
    supabase.from('fog_state').select('*').eq('session_id', session.id).single(),
    supabase.from('world_state').select('*').eq('session_id', session.id).single(),
  ])

  return (
    <MapDisplay
      session={session}
      isMaster={session.master_id === user?.id}
      currentUserId={user?.id ?? ''}
      initialTokens={tokens ?? []}
      initialMapState={mapState ?? null}
      initialFogState={fogState ?? null}
      initialWorldState={worldState ?? null}
    />
  )
}
