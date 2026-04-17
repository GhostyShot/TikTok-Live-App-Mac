import { Howl, Howler } from 'howler';
import { AlertConfig, EventType, SoundBank } from '../types/audio';

export class SoundPlayer {
  private sounds: Map<string, Howl> = new Map();
  private soundBank: SoundBank = {};
  private globalVolume: number = 1;
  private alertConfigs: Map<EventType, AlertConfig> = new Map();

  constructor() {
    this.initializeDefaultAlerts();
  }

  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertConfig[] = [
      { type: 'follower', enabled: true, volume: 80, animationDuration: 5, cooldown: 30 },
      { type: 'gift', enabled: true, volume: 100, animationDuration: 7, cooldown: 10 },
      { type: 'viewer', enabled: false, volume: 50, animationDuration: 3, cooldown: 60 },
      { type: 'share', enabled: false, volume: 50, animationDuration: 3, cooldown: 30 },
      { type: 'like', enabled: false, volume: 30, animationDuration: 2, cooldown: 5 },
    ];

    defaultAlerts.forEach(config => {
      this.alertConfigs.set(config.type, config);
    });
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume / 100));
    Howler.volume(this.globalVolume);
  }

  getGlobalVolume(): number {
    return this.globalVolume * 100;
  }

  setAlertConfig(type: EventType, config: Partial<AlertConfig>): void {
    const existing = this.alertConfigs.get(type) || { type, enabled: true, volume: 80, animationDuration: 5, cooldown: 30 };
    this.alertConfigs.set(type, { ...existing, ...config });
  }

  getAlertConfig(type: EventType): AlertConfig | undefined {
    return this.alertConfigs.get(type);
  }

  getAllAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values());
  }

  addSoundToBank(id: string, name: string, data: ArrayBuffer, duration: number = 0): void {
    this.soundBank[id] = { name, data, duration };
  }

  removeSoundFromBank(id: string): void {
    delete this.soundBank[id];
    const sound = this.sounds.get(id);
    if (sound) {
      sound.unload();
      this.sounds.delete(id);
    }
  }

  getSoundBank(): SoundBank {
    return this.soundBank;
  }

  private getAlertVolume(type: EventType): number {
    const config = this.alertConfigs.get(type);
    return config ? config.volume / 100 : 0.8;
  }

  private checkCooldown(type: EventType): boolean {
    const config = this.alertConfigs.get(type);
    if (!config || !config.lastPlayed) return true;

    const now = Date.now();
    const cooldownMs = (config.cooldown || 0) * 1000;
    return now - config.lastPlayed >= cooldownMs;
  }

  async playSound(soundId: string, type?: EventType): Promise<boolean> {
    const soundData = this.soundBank[soundId];
    if (!soundData) return false;

    const blob = new Blob([soundData.data], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    const volume = type ? this.getAlertVolume(type) : this.globalVolume;

    const howl = new Howl({
      src: [url],
      volume: volume,
      onend: () => {
        URL.revokeObjectURL(url);
      },
      onloaderror: () => {
        URL.revokeObjectURL(url);
      }
    });

    howl.play();
    return true;
  }

  async triggerAlert(type: EventType, variables: Record<string, string> = {}): Promise<boolean> {
    const config = this.alertConfigs.get(type);
    if (!config || !config.enabled) return false;
    if (!this.checkCooldown(type)) return false;

    if (config.customSoundData) {
      const blob = new Blob([config.customSoundData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      const volume = config.volume / 100;

      const howl = new Howl({
        src: [url],
        volume: volume,
        onend: () => {
          URL.revokeObjectURL(url);
        }
      });

      howl.play();

      this.alertConfigs.set(type, {
        ...config,
        lastPlayed: Date.now()
      });

      return true;
    }

    if (config.soundFile) {
      const played = await this.playSound(config.soundFile, type);
      if (played) {
        this.alertConfigs.set(type, {
          ...config,
          lastPlayed: Date.now()
        });
      }
      return played;
    }

    return false;
  }

  stopAll(): void {
    Howler.stop();
  }

  mute(muted: boolean): void {
    Howler.mute(muted);
  }

  isMuted(): boolean {
    return Howler.state() === 'suspended';
  }

  dispose(): void {
    this.sounds.forEach(sound => sound.unload());
    this.sounds.clear();
    Howler.unload();
  }
}

export const soundPlayer = new SoundPlayer();