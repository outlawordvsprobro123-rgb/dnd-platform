'use client'
import type { Session, Character } from '@/lib/supabase/types'
import { getModifier, formatModifier } from '@/lib/utils/dnd'

interface Props {
  session: Session
  characters: Character[]
}

const STAT_LABELS: Record<string, string> = {
  str: 'СИЛ', dex: 'ЛОВ', con: 'ТЕЛ', int: 'ИНТ', wis: 'МУД', cha: 'ХАР',
}

export default function PlayerMobileView({ session, characters }: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Шапка */}
      <header style={{
        background: 'linear-gradient(180deg, #1a1209 0%, #120c04 100%)',
        borderBottom: '1px solid var(--border-gold)',
        padding: '0 1rem',
        height: '3.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 20px rgba(0,0,0,.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <a href="/dashboard" style={{
            color: 'var(--text-muted)',
            fontSize: '.85rem',
            fontFamily: "'Alegreya SC', serif",
            letterSpacing: '.05em',
            textDecoration: 'none',
            padding: '.5rem',
            marginLeft: '-.5rem',
          }}>
            ← Главная
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{
            fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif",
            fontSize: '.8rem',
            color: 'var(--gold)',
            letterSpacing: '.1em',
          }}>
            {session.name}
          </span>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '.7rem',
            color: 'var(--gold-dim)',
            letterSpacing: '.2em',
            background: 'rgba(139,105,20,.1)',
            border: '1px solid var(--border)',
            borderRadius: '.3rem',
            padding: '.1rem .4rem',
          }}>
            {session.code}
          </span>
        </div>
      </header>

      {/* Контент */}
      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px', margin: '0 auto', width: '100%' }}>

        {/* Заголовок секции */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '.25rem' }}>
          <span style={{
            fontFamily: "'Alegreya SC', serif",
            fontSize: '.7rem',
            letterSpacing: '.25em',
            color: 'var(--gold-dim)',
            textTransform: 'uppercase',
          }}>
            Мои персонажи
          </span>
          <a
            href="/character/new"
            style={{
              fontFamily: "'Alegreya SC', serif",
              fontSize: '.7rem',
              letterSpacing: '.1em',
              color: 'var(--gold)',
              textDecoration: 'none',
              border: '1px solid var(--border-gold)',
              borderRadius: '.35rem',
              padding: '.35rem .75rem',
              background: 'rgba(139,105,20,.08)',
            }}
          >
            + Создать
          </a>
        </div>

        {/* Список персонажей */}
        {characters.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            border: '1px solid var(--border)',
            borderRadius: '.75rem',
            background: 'rgba(255,255,255,.02)',
          }}>
            <div style={{ fontSize: '2.5rem', opacity: .25, marginBottom: '1rem' }}>◈</div>
            <p style={{
              color: 'var(--text-muted)',
              fontFamily: "'Mookmania', 'Alegreya SC', serif",
              fontStyle: 'italic',
              fontSize: '1rem',
              marginBottom: '1.25rem',
            }}>
              У вас нет персонажей
            </p>
            <a
              href="/character/new"
              style={{
                display: 'inline-block',
                fontFamily: "'Alegreya SC', serif",
                fontSize: '.75rem',
                letterSpacing: '.1em',
                color: 'var(--gold)',
                textDecoration: 'none',
                border: '1px solid var(--border-gold)',
                borderRadius: '.4rem',
                padding: '.6rem 1.5rem',
                background: 'linear-gradient(135deg, rgba(139,105,20,.15), rgba(139,105,20,.05))',
              }}
            >
              Создать персонажа
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {characters.map(char => (
              <a
                key={char.id}
                href={`/character/${char.id}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '.75rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(139,105,20,.05), rgba(0,0,0,.2))',
                  transition: 'border-color .15s',
                }}
              >
                {/* Верх карточки */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                  <div>
                    <p style={{
                      fontFamily: "'Alegreya SC', serif",
                      fontSize: '1.1rem',
                      color: 'var(--text-primary)',
                      marginBottom: '.2rem',
                    }}>
                      {char.name}
                    </p>
                    <p style={{
                      color: 'var(--text-muted)',
                      fontSize: '.8rem',
                      fontFamily: "'Mookmania', 'Alegreya SC', serif",
                    }}>
                      {char.race} · {char.class} · {char.level} ур.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{
                      fontFamily: "'Alegreya SC', serif",
                      fontSize: '.85rem',
                      color: '#c0392b',
                      fontWeight: 600,
                    }}>
                      {char.hp_current}/{char.hp_max} HP
                    </p>
                    <p style={{
                      fontFamily: "'Alegreya SC', serif",
                      fontSize: '.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '.15rem',
                    }}>
                      КД {char.armor_class}
                    </p>
                  </div>
                </div>

                {/* Характеристики */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '.25rem',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '.75rem',
                }}>
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                    <div key={stat} style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: "'Alegreya SC', serif",
                        fontSize: '.5rem',
                        letterSpacing: '.06em',
                        color: 'var(--gold-dim)',
                        textTransform: 'uppercase',
                        marginBottom: '.15rem',
                      }}>
                        {STAT_LABELS[stat]}
                      </div>
                      <div style={{
                        fontFamily: "'Alegreya SC', serif",
                        fontSize: '.9rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}>
                        {formatModifier(getModifier((char.stats as Record<string, number>)?.[stat] ?? 10))}
                      </div>
                      <div style={{
                        fontFamily: "'Alegreya SC', serif",
                        fontSize: '.55rem',
                        color: 'var(--text-muted)',
                      }}>
                        {(char.stats as Record<string, number>)?.[stat] ?? 10}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Стрелка */}
                <div style={{
                  marginTop: '.75rem',
                  textAlign: 'right',
                  fontFamily: "'Alegreya SC', serif",
                  fontSize: '.65rem',
                  color: 'var(--gold-dim)',
                  letterSpacing: '.15em',
                }}>
                  Открыть лист →
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Подсказка */}
        <div style={{
          textAlign: 'center',
          padding: '.75rem',
          color: 'var(--text-muted)',
          fontFamily: "'Mookmania', 'Alegreya SC', serif",
          fontStyle: 'italic',
          fontSize: '.8rem',
          borderTop: '1px solid var(--border)',
          marginTop: 'auto',
        }}>
          Для полного доступа к карте и бою используйте компьютер
        </div>
      </div>
    </div>
  )
}
