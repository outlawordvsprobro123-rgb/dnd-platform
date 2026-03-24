'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCombatStore } from '@/lib/stores/combatStore'
import type { CombatState, CombatParticipant } from '@/lib/supabase/types'

export function useCombatChannel(sessionId: string) {
  const supabase = createClient()
  const { setParticipants, updateParticipant, setCurrentTurn, setRound, setIsActive, reset } = useCombatStore()

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`combat:${sessionId}`)

    // Обновление состояния боя (смена хода, раунда)
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'combat_state',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: state }) => {
      const combat = state as CombatState
      setCurrentTurn(combat.current_turn)
      setRound(combat.round)
      setIsActive(combat.is_active)
      if (!combat.is_active) reset()
    })

    // Обновление участника (HP, состояния)
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'combat_participants',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: participant }) => {
      updateParticipant((participant as CombatParticipant).id, participant as Partial<CombatParticipant>)
    })

    // Добавление участника
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'combat_participants',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: participant }) => {
      const p = participant as CombatParticipant
      setParticipants([...useCombatStore.getState().participants, p]
        .sort((a, b) => a.sort_order - b.sort_order))
    })

    // Удаление участника
    channel.on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'combat_participants',
      filter: `session_id=eq.${sessionId}`
    }, ({ old }) => {
      const id = (old as { id: string }).id
      setParticipants(useCombatStore.getState().participants.filter(p => p.id !== id))
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])
}
