import { soundPlayer } from './SoundPlayer';

interface VolumeControl {
  getMasterVolume(): number;
  setMasterVolume(volume: number): void;
  getEventTypeVolume(eventType: string): number;
  setEventTypeVolume(eventType: string, volume: number): void;
  mute(): void;
  unmute(): void;
  isMuted(): boolean;
  toggleMute(): boolean;
}

class VolumeController implements VolumeControl {
  private muted: boolean = false;
  private masterVolume: number = 80;
  private eventTypeVolumes: Map<string, number> = new Map();

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(100, volume));
    soundPlayer.setGlobalVolume(this.masterVolume);
  }

  getEventTypeVolume(eventType: string): number {
    return this.eventTypeVolumes.get(eventType) ?? this.masterVolume;
  }

  setEventTypeVolume(eventType: string, volume: number): void {
    this.eventTypeVolumes.set(eventType, Math.max(0, Math.min(100, volume)));
  }

  mute(): void {
    this.muted = true;
    soundPlayer.mute(true);
  }

  unmute(): void {
    this.muted = false;
    soundPlayer.mute(false);
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }
}

export const volumeController = new VolumeController();

export { SoundPlayer, soundPlayer } from './SoundPlayer';
export { TTSEngine, ttsEngine } from './TTSEngine';
export { AlertManager, alertManager } from './AlertManager';
export { AlertConfig, EventType, TTSConfig, TTSVoice, SoundBank } from '../types/audio';