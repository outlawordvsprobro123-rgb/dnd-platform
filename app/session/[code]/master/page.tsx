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
    supabase.from('session_players').select('user_id, character_id').eq('session_id', session.id),
    supabase.from('loot_items').select('id, name, type, rarity, description, weight').order('name').limit(300),
    supabase.from('spells').select('id, name, level, school, classes').order('level').order('name').limit(400),
  ])

  // Получаем персонажей всех игроков сессии через service role (RLS блокирует чужих персонажей)
  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()

  const playerUserIds = (sessionPlayers ?? []).map(p => p.user_id).filter(Boolean) as string[]
  const characterIds = (sessionPlayers ?? []).map(p => p.character_id).filter(Boolean) as string[]

  // Персонажи привязанные к игрокам сессии
  const { data: charsByIds } = characterIds.length > 0
    ? await service.from('characters').select('id, name, image_url, user_id').in('id', characterIds)
    : { data: [] }

  // Все персонажи игроков (даже если не привязаны в session_players)
  const { data: charsByUsers } = playerUserIds.length > 0
    ? await service.from('characters').select('id, name, image_url, user_id').in('user_id', playerUserIds)
    : { data: [] }

  // Объединяем без дублей
  const seen = new Set<string>()
  const allSessionChars = [...(charsByIds ?? []), ...(charsByUsers ?? [])].filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

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
