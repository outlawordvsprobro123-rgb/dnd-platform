import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BestiaryList from '@/components/bestiary/BestiaryList'
import { NavBar } from '@/components/layout/NavBar'

export default async function BestiaryPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatures } = await supabase
    .from('bestiary')
    .select('*')
    .order('cr', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🐉 Бестиарий</h1>
          <p className="text-gray-400 text-sm">Существа SRD 5.1 и homebrew</p>
        </div>
        <BestiaryList creatures={creatures ?? []} />
      </div>
    </div>
  )
}
