import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewCharacterForm from '@/components/character/NewCharacterForm'

export default async function NewCharacterPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <NewCharacterForm />
      </div>
    </div>
  )
}
