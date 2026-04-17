import { TTSConfig, TTSVoice } from '../types/audio';

interface QueuedMessage {
  id: string;
  text: string;
  config: TTSConfig;
}

export class TTSEngine {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private defaultConfig: TTSConfig = {
    voice: '',
    rate: 1,
    volume: 1,
    pitch: 1
  };
  private messageQueue: QueuedMessage[] = [];
  private maxQueueSize: number = 10;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    this.voices = this.synthesis.getVoices();
  }

  getAvailableVoices(): TTSVoice[] {
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      voiceURI: v.voiceURI
    }));
  }

  setDefaultConfig(config: Partial<TTSConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  getDefaultConfig(): TTSConfig {
    return { ...this.defaultConfig };
  }

  private findVoice(voiceName: string): SpeechSynthesisVoice | null {
    if (!voiceName) {
      return this.voices.find(v => v.default) || this.voices[0] || null;
    }
    return this.voices.find(v => v.name === voiceName || v.voiceURI === voiceName) || null;
  }

  private processVariables(text: string, variables: Record<string, string>): string {
    let processed = text;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return processed;
  }

  speak(text: string, variables: Record<string, string> = {}, config?: Partial<TTSConfig>): string {
    const messageId = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalConfig = { ...this.defaultConfig, ...config };
    const processedText = this.processVariables(text, variables);

    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      id: messageId,
      text: processedText,
      config: finalConfig
    });

    if (!this.isSpeaking) {
      this.processQueue();
    }

    return messageId;
  }

  private processQueue(): void {
    if (this.messageQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const message = this.messageQueue.shift()!;
    
    this.executeSpeak(message.text, message.config);
  }

  private executeSpeak(text: string, config: TTSConfig): void {
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voice = this.findVoice(config.voice);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = Math.max(0.5, Math.min(2, config.rate));
    utterance.volume = Math.max(0, Math.min(1, config.volume));
    utterance.pitch = Math.max(0.5, Math.min(2, config.pitch));

    utterance.onend = () => {
      this.currentUtterance = null;
      this.processQueue();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      this.processQueue();
    };

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  cancel(): void {
    this.synthesis.cancel();
    this.messageQueue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  skip(): void {
    if (this.currentUtterance) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
    this.isSpeaking = false;
    this.processQueue();
  }

  getQueueLength(): number {
    return this.messageQueue.length;
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  pause(): void {
    this.synthesis.pause();
  }

  resume(): void {
    this.synthesis.resume();
  }
}

export const ttsEngine = new TTSEngine();