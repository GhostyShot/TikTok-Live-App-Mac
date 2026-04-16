# TikTok Live Companion App Specification

## 1. Project Overview

**Project Name:** TikLive Companion  
**Project Type:** Desktop Application (Electron + React)  
**Core Feature Summary:** A real-time TikTok Live companion app that provides interactive overlays, alerts, text-to-speech, and automation for streamers.  
**Target Users:** TikTok Live streamers who want to enhance viewer engagement and automate their streams.

---

## 2. Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron 28.x |
| UI Library | React 18.x |
| Build Tool | Vite 5.x |
| Language | TypeScript 5.x |
| State Management | Zustand |
| Styling | Tailwind CSS |
| WebSocket | Socket.io Client |
| OBS Integration | obs-websocket-js |
| TTS | Web Speech API |

---

## 3. UI/UX Specification

### 3.1 Window Model

- **Main Window:** 1200x800 default, min 900x600, resizable
- **Overlay Window:** Separate transparent window for OBS/browser source embedding
- **System Tray:** Minimize to tray for background operation

### 3.2 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: App title, connection status, minimize/close     │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Sidebar   │              Main Content                 │
│  - Events  │  (Event log, alerts manager, flows,        │
│  - Alerts  │   settings panels)                       │
│  - Flows   │                                            │
│  - Overlays│                                            │
│  - Settings│                                            │
│            │                                            │
├────────────┴────────────────────────────────────────────┤
│ Footer: Stream status, viewer count, duration          │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background Primary | Dark Purple | #0D0B14 |
| Background Secondary | Deep Violet | #1A1625 |
| Surface | Dark Gray | #252130 |
| Primary Accent | Electric Pink | #FF2D55 |
| Secondary Accent | Cyan | #00F0FF |
| Success | Green | #00D26A |
| Warning | Orange | #FF9F0A |
| Error | Red | #FF3B30 |
| Text Primary | White | #FFFFFF |
| Text Secondary | Light Gray | #A0A0B0 |
| Text Muted | Gray | #6B6B7B |

### 3.4 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| App Title | Inter | 18px | 600 |
| Section Headers | Inter | 16px | 600 |
| Body Text | Inter | 14px | 400 |
| Labels | Inter | 12px | 500 |
| Small Text | Inter | 11px | 400 |

### 3.5 Component Specifications

#### Sidebar Navigation
- Width: 220px fixed
- Items: Icon + label, 44px height
- Active state: Left border accent + background highlight
- Hover: Background #252130

#### Event List
- Scrollable container with virtual scrolling
- Event item: 60px height, timestamp, event type icon, user info, details
- Maximum 500 events displayed

#### Alert Cards
- Rounded corners: 12px
- Padding: 16px
- Background: #252130
- Border on hover: 1px #FF2D55

#### Buttons
- Primary: Background #FF2D55, text white, rounded 8px
- Secondary: Background transparent, border 1px #A0A0B0, rounded 8px
- Height: 36px (default), 32px (small), 44px (large)

#### Input Fields
- Background: #1A1625
- Border: 1px #3D3A4A
- Focus border: #FF2D55
- Border radius: 8px
- Height: 40px

---

## 4. Functional Specification

### 4.1 Core Features

#### 4.1.1 TikTok Connection
- Connect using TikTok live room URL or room ID
- WebSocket connection for real-time event streaming
- Auto-reconnect on disconnect (5-second intervals, max 10 attempts)
- Connection status indicator in header

#### 4.1.2 Real-Time Event Processing

| Event Type | Description | Display Priority |
|------------|-------------|------------------|
| chat_comment | New chat message | High |
| viewer | New viewer joined | Medium |
| follow | New follower | High |
| share | Stream shared | Medium |
| like | Viewer likes | Low |
| gift | Gift received | Critical |
| room_user_update | Viewer count change | Medium |
| stream_end | Stream ended | High |

#### 4.1.3 Alerts System

**Alert Types:**
- Follower Alert: Animations + sound + TTS message
- Gift Alert: Customizable per gift type + sound + TTS
- New Viewer Alert: Sound notification
- Share Alert: Display notification

**Alert Configuration:**
- Enable/disable per alert type
- Custom sound file upload (MP3, WAV)
- Sound volume control (0-100%)
- TTS message customization with variables: {username}, {gift_name}, {gift_count}
- Animation overlay duration (1-10 seconds)
- Alert cooldown per type (0-60 seconds)

#### 4.1.4 Text-to-Speech (TTS)

- Voice selection from available system voices
- Volume control (0-100%)
- Rate control (0.5x - 2x)
- Pitch control (0.5 - 2)
- Default messages for:
  - New follower
  - Gift (with gift name and count)
  - Chat messages (optional, with rate limit)
- Queue system for messages (max 10 queued)

#### 4.1.5 Overlays

**Overlay Elements:**
- Follower goal progress bar
- Total gift value counter
- Viewer count display
- Top gifters leaderboard (top 5/10)
- Recent gift feed (scrolling list)
- Custom text labels
- Timer/countdown
- Chat overlay (recent messages)

**Overlay Features:**
- Single URL for OBS browser source
- Real-time updates via WebSocket
- Customizable colors per element
- Font size adjustment
- Position adjustment
- Opacity control

#### 4.1.6 Automation Flows

**Flow System:**
- Event triggers (based on event types)
- Actions: Play sound, Show overlay, Send TTS, Custom text, Run command

**Flow Configuration:**
- Trigger conditions:
  - Event type matching
  - Username filter (exact or contains)
  - Gift value threshold (minimum coins)
  - Custom regex on message content
- Action sequences (multiple per flow)
- Enable/disable toggle
- Test mode (manual trigger)

**Preset Flows:**
- Welcome new followers
- Thank for gifts (by value tier)
- Read chat on command (!tts)
- Follower milestone celebrations

### 4.2 OBS Integration

#### 4.2.1 Browser Source
- Overlay accessible via local HTTP server (port 47821)
- Standard URL format: `http://localhost:47821/overlay`
- Custom overlay URL: `http://localhost:47821/overlay?profile=<name>`

#### 4.2.2 OBS WebSocket
- Connect to OBS via obs-websocket-js
- Features:
  - Get current scene items
  - Trigger source visibility
  - Scene switching on events
  - Filter/source toggles

### 4.3 Settings

#### Connection Settings
- TikTok room URL/ID input
- Auto-connect on startup toggle

#### Alert Settings
- Global alert enable/disable
- Default sound files
- Default TTS voice

#### Overlay Settings
- Theme selection (dark/light/custom)
- Animation preferences

#### Automation Settings
- Flow enable/disable
- Command prefix customization

---

## 5. Data Flow Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  TikTok Web │────>│ Event Parser │────>│ Event Store │
│   Socket    │      │              │      │  (Zustand)  │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                 │
                    ┌──────────────┐              │
                    │   Alert     │<─────────────┘
                    │  Processor │
                    └──────┬─────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │  TTS    │       │  Sound  │       │ Overlay │
   │ Engine │       │  Player │       │  Render │
   └────────┘       └─────────┘       └─────────┘
```

---

## 6. Key Modules Design

### 6.1 EventParser
```typescript
interface TikTokEvent {
  eventType: string;
  username: string;
  profileImageUrl?: string;
  message?: string;
  giftName?: string;
  giftCount?: number;
  giftValue?: number;
  timestamp: number;
}

class EventParser {
  parse(rawData: WebSocketMessage): TikTokEvent | null;
}
```

### 6.2 AlertManager
```typescript
interface AlertConfig {
  type: 'follower' | 'gift' | 'viewer' | 'share' | 'like';
  enabled: boolean;
  soundFile?: string;
  volume: number;
  ttsMessage?: string;
  animationDuration: number;
  cooldown: number;
}

class AlertManager {
  trigger(event: TikTokEvent): void;
  playSound(path: string, volume: number): void;
  speakTTS(message: string): void;
}
```

### 6.3 FlowEngine
```typescript
interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: FlowTrigger;
  actions: FlowAction[];
}

interface FlowTrigger {
  eventType: string;
  conditions?: TriggerCondition[];
}

interface FlowAction {
  type: 'sound' | 'tts' | 'overlay' | 'text';
  config: Record<string, unknown>;
}

class FlowEngine {
  evaluate(event: TikTokEvent, flow: Flow): boolean;
  execute(flow: Flow): Promise<void>;
}
```

### 6.4 OverlayServer
```typescript
class OverlayServer {
  start(): void;
  stop(): void;
  registerHandler(path: string, handler: RequestHandler): void;
}
```

---

## 7. Acceptance Criteria

### 7.1 Connection
- [ ] Can connect to TikTok live room via URL or ID
- [ ] Displays connection status in header
- [ ] Auto-reconnects on disconnect

### 7.2 Events
- [ ] Receives and displays chat messages in real-time
- [ ] Detects and logs new followers
- [ ] Processes gift events with correct details
- [ ] Updates viewer count

### 7.3 Alerts
- [ ] Can create and customize alerts for each event type
- [ ] Plays sound when alert triggers
- [ ] Speaks TTS message when alert triggers
- [ ] Alert cooldown works correctly

### 7.4 TTS
- [ ] Can speak text messages using system voices
- [ ] Volume and rate controls work
- [ ] Message queue handles multiple messages

### 7.5 Overlays
- [ ] Overlay URL accessible in OBS browser source
- [ ] Real-time updates reflect in overlay
- [ ] Can customize overlay appearance

### 7.6 Automation
- [ ] Can create flows with custom triggers
- [ ] Flows execute actions when conditions match
- [ ] Can test flows manually

### 7.7 OBS Integration
- [ ] Can connect to OBS WebSocket
- [ ] Can trigger OBS scene changes via flows

### 7.8 Window Management
- [ ] Minimize to system tray works
- [ ] Restore from tray works
- [ ] Window close behavior configurable

---

## 8. Milestones

| Milestone | Deliverables |
|-----------|--------------|
| 1. Project Setup | Electron + React scaffolding, basic routing |
| 2. Connection | TikTok WebSocket connection, event parsing |
| 3. UI Basics | Sidebar navigation, event list display |
| 4. Alerts | Alert configuration UI, sound playback |
| 5. TTS | TTS engine, voice selection |
| 6. Overlays | Overlay server, basic overlay elements |
| 7. Automation | Flows system, preset flows |
| 8. OBS Integration | OBS WebSocket connection |
| 9. Polish | Settings, system tray, final UI refinements |