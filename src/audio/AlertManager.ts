import { soundPlayer } from './SoundPlayer';
import { ttsEngine } from './TTSEngine';
import { AlertConfig, EventType, TTSConfig } from '../types/audio';

interface AlertContext {
  username?: string;
  giftName?: string;
  giftCount?: number;
  giftValue?: number;
  message?: string;
  [key: string]: string | number | undefined;
}

export class AlertManager {
  private defaultMessages: Record<EventType, string> = {
    follower: 'Welcome {username}! Thanks for following!',
    gift: 'Thank you {username} for the {giftName}!',
    viewer: 'A new viewer joined: {username}',
    share: 'Thanks {username} for sharing the stream!',
    like: '',
    chat: '',
    room_user_update: '',
    stream_end: ''
  };

  setDefaultMessage(eventType: EventType, message: string): void {
    this.defaultMessages[eventType] = message;
  }

  getDefaultMessage(eventType: EventType): string {
    return this.defaultMessages[eventType] || '';
  }

  processVariables(template: string, context: AlertContext): string {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }
    return result;
  }

  async trigger(eventType: EventType, context: AlertContext): Promise<void> {
    const alertConfig = soundPlayer.getAlertConfig(eventType);
    if (!alertConfig || !alertConfig.enabled) return;

    await soundPlayer.triggerAlert(eventType, context);

    if (alertConfig.ttsMessage) {
      const ttsConfig: Partial<TTSConfig> = {
        volume: alertConfig.volume / 100,
        rate: 1,
        pitch: 1
      };

      const message = this.processVariables(alertConfig.ttsMessage, context);
      if (message.trim()) {
        ttsEngine.speak(message, {}, ttsConfig);
      }
    } else if (eventType === 'follower' || eventType === 'gift') {
      const defaultMessage = this.defaultMessages[eventType];
      if (defaultMessage) {
        const message = this.processVariables(defaultMessage, context);
        ttsEngine.speak(message, {}, { volume: alertConfig.volume / 100 });
      }
    }
  }

  getAlertConfigs(): AlertConfig[] {
    return soundPlayer.getAllAlertConfigs();
  }

  setAlertConfig(eventType: EventType, config: Partial<AlertConfig>): void {
    soundPlayer.setAlertConfig(eventType, config);
  }

  setAlertEnabled(eventType: EventType, enabled: boolean): void {
    const config = soundPlayer.getAlertConfig(eventType);
    if (config) {
      soundPlayer.setAlertConfig(eventType, { enabled });
    }
  }

  setAlertSound(eventType: EventType, soundFile?: string, customSoundData?: ArrayBuffer): void {
    soundPlayer.setAlertConfig(eventType, {
      soundFile,
      customSoundData
    });
  }

  setAlertVolume(eventType: EventType, volume: number): void {
    soundPlayer.setAlertConfig(eventType, { volume: Math.max(0, Math.min(100, volume)) });
  }

  setAlertTTS(eventType: EventType, ttsMessage?: string): void {
    soundPlayer.setAlertConfig(eventType, { ttsMessage });
  }

  setAlertCooldown(eventType: EventType, cooldown: number): void {
    soundPlayer.setAlertConfig(eventType, { cooldown: Math.max(0, Math.min(60, cooldown)) });
  }

  setAlertAnimationDuration(eventType: EventType, duration: number): void {
    soundPlayer.setAlertConfig(eventType, { animationDuration: Math.max(1, Math.min(10, duration)) });
  }
}

export const alertManager = new AlertManager();