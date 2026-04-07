import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CharacterSheet from '@/components/character/CharacterSheet'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CharacterPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: character }, { data: inventory }, { data: spells }, { data: spellSlots }] = await Promise.all([
    supabase.from('characters').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('character_inventory').select('*').eq('character_id', id).order('created_at'),
    supabase.from('character_spells').select('*').eq('character_id', id).order('spell_level').order('name'),
    supabase.from('spell_slots').select('*').eq('character_id', id).order('level'),
  ])

  if (!character) notFound()

  return <CharacterSheet character={character} inventory={inventory ?? []} spells={spells ?? []} spellSlots={spellSlots ?? []} />
}
