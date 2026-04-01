import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SpellList from '@/components/spells/SpellList'
import { NavBar } from '@/components/layout/NavBar'

export default async function SpellsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: spells } = await supabase
    .from('spells')
    .select('*')
    .order('level', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">✨ Заклинания</h1>
          <p className="text-gray-400 text-sm">SRD 5.1 · {spells?.length ?? 0} заклинаний</p>
        </div>
        <SpellList spells={spells ?? []} />
      </div>
    </div>
  )
}
