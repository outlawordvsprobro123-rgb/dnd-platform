import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LootList from '@/components/loot/LootList'
import { NavBar } from '@/components/layout/NavBar'

export default async function LootPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: items } = await supabase
    .from('loot_items')
    .select('*')
    .order('rarity', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">💎 Предметы</h1>
          <p className="text-gray-400 text-sm">Магические предметы и снаряжение SRD 5.1</p>
        </div>
        <LootList items={items ?? []} />
      </div>
    </div>
  )
}
