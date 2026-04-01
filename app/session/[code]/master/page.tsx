import { createServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import MasterPanelView from './MasterPanelView'

export default async function MasterPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase.from('sessions').select('*').eq('code', code.toUpperCase()).single()
  if (!session) notFound()
  if (session.master_id !== user.id) notFound()

  const [
    { data: mapState },
    { data: fogState },
    { data: worldState },
    { data: tokens },
    { data: bestiary },
    { data: masterCharacters },
    { data: sessionPlayers },
    { data: lootItems },
    { data: spells },
  ] = await Promise.all([
    supabase.from('map_state').select('*').eq('session_id', session.id).single(),
    supabase.from('fog_state').select('*').eq('session_id', session.id).single(),
    supabase.from('world_state').select('*').eq('session_id', session.id).single(),
    supabase.from('map_tokens').select('*').eq('session_id', session.id),
    supabase.from('bestiary').select('id, name, size, type, cr, hp, ac, image_url').order('name'),
    supabase.from('characters').select('id, name, race, class, level, hp_current, hp_max, image_url').eq('user_id', user.id),
    supabase.from('session_players').select('character_id').eq('session_id', session.id).not('character_id', 'is', null),
    supabase.from('loot_items').select('id, name, type, rarity, description, weight').order('name').limit(300),
    supabase.from('spells').select('id, name, level, school, classes').order('level').order('name').limit(400),
  ])

  // Fetch characters for all session players
  const characterIds = (sessionPlayers ?? []).map(p => p.character_id).filter(Boolean) as string[]
  const { data: allSessionChars } = characterIds.length > 0
    ? await supabase.from('characters').select('id, name, image_url').in('id', characterIds)
    : { data: [] }

  return (
    <MasterPanelView
      session={session}
      initialMapState={mapState ?? null}
      initialFogState={fogState ?? null}
      initialWorldState={worldState ?? null}
      initialTokens={tokens ?? []}
      bestiaryCreatures={bestiary ?? []}
      characters={masterCharacters ?? []}
      sessionCharacters={allSessionChars ?? []}
      lootItems={lootItems ?? []}
      spells={spells ?? []}
    />
  )
}
