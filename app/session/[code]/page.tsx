import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SessionView from './SessionView'

export default async function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: session } = await supabase.from('sessions').select('*').eq('code', code.toUpperCase()).single()
  if (!session) notFound()

  const [{ data: players }, { data: tokens }, { data: mapState }, { data: fogState }, { data: worldState }, { data: combatState }, { data: combatParticipants }, { data: musicScenes }, { data: musicState }, { data: characters }] = await Promise.all([
    supabase.from('session_players').select('*').eq('session_id', session.id),
    supabase.from('map_tokens').select('*').eq('session_id', session.id),
    supabase.from('map_state').select('*').eq('session_id', session.id).single(),
    supabase.from('fog_state').select('*').eq('session_id', session.id).single(),
    supabase.from('world_state').select('*').eq('session_id', session.id).single(),
    supabase.from('combat_state').select('*').eq('session_id', session.id).single(),
    supabase.from('combat_participants').select('*').eq('session_id', session.id).order('sort_order'),
    supabase.from('music_scenes').select('*').order('name'),
    supabase.from('music_state').select('*').eq('session_id', session.id).single(),
    supabase.from('characters').select('*').eq('user_id', user?.id ?? '').order('created_at', { ascending: false }),
  ])

  return (
    <SessionView
      session={session}
      isMaster={session.master_id === user?.id}
      currentUserId={user?.id ?? ''}
      initialPlayers={players ?? []}
      initialTokens={tokens ?? []}
      initialMapState={mapState ?? null}
      initialFogState={fogState ?? null}
      initialWorldState={worldState ?? null}
      initialCombatState={combatState ?? null}
      initialCombatParticipants={combatParticipants ?? []}
      musicScenes={musicScenes ?? []}
      initialMusicState={musicState ?? null}
      characters={characters ?? []}
    />
  )
}
