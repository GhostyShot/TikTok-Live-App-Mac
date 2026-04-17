export type EventType = 'follower' | 'gift' | 'viewer' | 'share' | 'like' | 'chat' | 'room_user_update' | 'stream_end';

export interface AlertConfig {
  type: EventType;
  enabled: boolean;
  soundFile?: string;
  customSoundData?: ArrayBuffer;
  volume: number;
  ttsMessage?: string;
  animationDuration: number;
  cooldown: number;
  lastPlayed?: number;
}

export interface SoundBank {
  [key: string]: {
    name: string;
    data: ArrayBuffer;
    duration: number;
  };
}

export interface TTSConfig {
  voice: string;
  rate: number;
  volume: number;
  pitch: number;
}

export interface TTSVoice {
  name: string;
  lang: string;
  localService: boolean;
  voiceURI: string;
}