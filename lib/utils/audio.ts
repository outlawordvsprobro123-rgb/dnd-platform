'use client'

import type { MusicTrack } from '@/lib/supabase/types'

// Динамический импорт Howler только на клиенте
let Howl: typeof import('howler').Howl | null = null

async function getHowl() {
  if (!Howl) {
    const howler = await import('howler')
    Howl = howler.Howl
  }
  return Howl
}

class AudioManager {
  private currentSound: import('howler').Howl | null = null
  private currentVolume: number = 0.7
  private fadeMs: number = 3000

  async playScene(tracks: MusicTrack[], volume?: number): Promise<void> {
    if (typeof window === 'undefined') return

    const HowlClass = await getHowl()
    if (!HowlClass) return

    const vol = volume ?? this.currentVolume

    // Плавно выключаем текущий звук
    if (this.currentSound) {
      const old = this.currentSound
      old.fade(old.volume(), 0, this.fadeMs)
      setTimeout(() => old.stop(), this.fadeMs)
    }

    if (!tracks.length) return

    // Создаём новый звук
    const urls = tracks.map(t => t.url)
    const sound = new HowlClass({
      src: urls,
      loop: true,
      volume: 0,
      onload: () => {
        sound.fade(0, vol, this.fadeMs)
      },
      onloaderror: (_id: number, err: unknown) => {
        console.error('Ошибка загрузки аудио:', err)
      },
    })

    sound.play()
    this.currentSound = sound
    this.currentVolume = vol
  }

  pause(): void {
    this.currentSound?.pause()
  }

  resume(): void {
    if (this.currentSound && !this.currentSound.playing()) {
      this.currentSound.play()
    }
  }

  stop(): void {
    if (this.currentSound) {
      this.currentSound.fade(this.currentSound.volume(), 0, 1000)
      setTimeout(() => this.currentSound?.stop(), 1000)
      this.currentSound = null
    }
  }

  setVolume(volume: number): void {
    this.currentVolume = volume
    if (this.currentSound) {
      this.currentSound.volume(volume)
    }
  }

  getVolume(): number {
    return this.currentVolume
  }

  isPlaying(): boolean {
    return this.currentSound?.playing() ?? false
  }
}

// Синглтон
let audioManagerInstance: AudioManager | null = null

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager()
  }
  return audioManagerInstance
}
