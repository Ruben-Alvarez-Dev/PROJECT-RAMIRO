# Design System

**Aesthetic:** Sentient Void — Dark-first, premium, modern. Inspired by Perplexity, Gemini Live, ChatGPT.

---

## 1. Design Tokens

### Colors

```scss
// ─── Base Palette ───
$color-void:           #0a0a0f;     // Deep background
$color-surface:        #12121a;     // Card/panel surface
$color-surface-hover:  #1a1a25;     // Interactive surface
$color-border:         #2a2a3a;     // Subtle borders
$color-border-active:  #4a4a6a;     // Active/focus borders

// ─── Text ───
$text-primary:         #e8e8f0;     // Primary text
$text-secondary:       #8888a8;     // Secondary text
$text-tertiary:        #5a5a78;     // Muted text
$text-inverse:         #0a0a0f;     // Text on light backgrounds

// ─── Accent ───
$accent-primary:       #6c5ce7;     // Primary accent (violet)
$accent-primary-light: #a29bfe;     // Light variant
$accent-secondary:     #00cec9;     // Secondary accent (teal)
$accent-warning:       #fdcb6e;     // Warning
$accent-error:         #ff6b6b;     // Error
$accent-success:       #00b894;     // Success

// ─── Glow Effects ───
$glow-primary:   0 0 20px rgba(108, 92, 231, 0.3);
$glow-secondary: 0 0 20px rgba(0, 206, 201, 0.3);
```

### Typography

```scss
$font-sans:    'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
$font-mono:    'JetBrains Mono', 'Fira Code', monospace;

$font-size-xs:   0.75rem;   // 12px
$font-size-sm:   0.875rem;  // 14px
$font-size-base: 1rem;      // 16px
$font-size-lg:   1.125rem;  // 18px
$font-size-xl:   1.25rem;   // 20px
$font-size-2xl:  1.5rem;    // 24px
$font-size-3xl:  2rem;      // 32px

$line-height-tight:  1.25;
$line-height-normal: 1.5;
$line-height-relaxed: 1.75;
```

### Spacing

```scss
$space-1: 0.25rem;   // 4px
$space-2: 0.5rem;    // 8px
$space-3: 0.75rem;   // 12px
$space-4: 1rem;      // 16px
$space-5: 1.25rem;   // 20px
$space-6: 1.5rem;    // 24px
$space-8: 2rem;      // 32px
$space-10: 2.5rem;   // 40px
$space-12: 3rem;     // 48px
$space-16: 4rem;     // 64px
```

### Border Radius

```scss
$radius-sm:   0.375rem;  // 6px
$radius-md:   0.5rem;    // 8px
$radius-lg:   0.75rem;   // 12px
$radius-xl:   1rem;      // 16px
$radius-2xl:  1.5rem;    // 24px
$radius-full: 9999px;    // Pill
```

### Shadows & Elevation

```scss
$shadow-sm:   0 1px 2px rgba(0, 0, 0, 0.3);
$shadow-md:   0 4px 6px rgba(0, 0, 0, 0.4);
$shadow-lg:   0 10px 15px rgba(0, 0, 0, 0.5);
$shadow-xl:   0 20px 25px rgba(0, 0, 0, 0.6);
```

### Animation

```scss
$transition-fast:   150ms ease;
$transition-normal: 250ms ease;
$transition-slow:   400ms ease;

$ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
$ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
```

## 2. BEM Naming Convention

```scss
// Block
.ramiro-chat { }

// Element
.ramiro-chat__message { }
.ramiro-chat__input { }
.ramiro-chat__toolbar { }

// Modifier
.ramiro-chat__message--user { }
.ramiro-chat__message--assistant { }
.ramiro-chat__message--system { }
.ramiro-chat__input--disabled { }
.ramiro-chat__toolbar--compact { }

// State (data attributes)
.ramiro-chat__message[data-status="sending"] { }
.ramiro-chat__message[data-status="error"] { }

// Composed blocks
.ramiro-video-grid { }
.ramiro-video-grid__cell { }
.ramiro-video-grid__cell--active { }
.ramiro-video-grid__cell--pip { }
```

## 3. Component Inventory (Atomic Design)

### Atoms
| Component | BEM Class | Description |
|-----------|-----------|-------------|
| Button | `.ramiro-button` | Primary, secondary, ghost, icon variants |
| Input | `.ramiro-input` | Text, search, textarea |
| Badge | `.ramiro-badge` | Status, count, label |
| Avatar | `.ramiro-avatar` | User/model avatar with status indicator |
| Icon | `.ramiro-icon` | SVG icon wrapper |
| Spinner | `.ramiro-spinner` | Loading indicator |
| Tooltip | `.ramiro-tooltip` | Hover tooltip |
| Toggle | `.ramiro-toggle` | Switch/checkbox |

### Molecules
| Component | BEM Class | Description |
|-----------|-----------|-------------|
| MessageBubble | `.ramiro-message` | Chat message with avatar, content, metadata |
| SourceCard | `.ramiro-source-card` | Knowledge source reference |
| AudioWaveform | `.ramiro-waveform` | Realtime audio visualization |
| VideoThumbnail | `.ramiro-video-thumb` | Video source preview |
| ModelSelector | `.ramiro-model-select` | LLM provider/model picker |
| StreamIndicator | `.ramiro-stream-indicator` | Live recording status |
| TierBadge | `.ramiro-tier-badge` | Knowledge TIER indicator (0-3) |

### Organisms
| Component | BEM Class | Description |
|-----------|-----------|-------------|
| ChatPanel | `.ramiro-chat` | Full chat interface |
| VideoGrid | `.ramiro-video-grid` | Multi-source video display (1-4 sources) |
| AudioPipeline | `.ramiro-audio-pipeline` | Audio controls + waveform + VAD |
| KnowledgePanel | `.ramiro-knowledge` | TIER browser + search |
| SessionSidebar | `.ramiro-sidebar` | Session list + memory |
| ControlBar | `.ramiro-control-bar` | Mic/camera/screen/model controls |
| ContextMeter | `.ramiro-context-meter` | Context window usage visualization |

### Templates / Pages
| Component | BEM Class | Description |
|-----------|-----------|-------------|
| VoiceSession | `.ramiro-page--voice` | Audio-only conversation view |
| VideoSession | `.ramiro-page--video` | Video + chat + knowledge combined |
| StudySession | `.ramiro-page--study` | TIER 0 document + voice Q&A |
| Dashboard | `.ramiro-page--dashboard` | Session history + settings |

## 4. Layout System

```scss
// Desktop (macOS app): 1200px+ main content
// Web: responsive from 768px to 1920px
// Mobile: 320px to 768px

.ramiro-layout {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-rows: 56px 1fr 64px;
  height: 100vh;
  gap: 0;
}

// Grid areas:
// ┌──────────────────────────────────────────┐
// │              ControlBar                   │
// ├──────────┬────────────────┬──────────────┤
// │          │                │              │
// │ Sidebar  │   Chat/Video   │  Knowledge   │
// │          │    (main)      │   Panel      │
// │          │                │              │
// ├──────────┴────────────────┴──────────────┤
// │           AudioPipeline                  │
// └──────────────────────────────────────────┘
```

## 5. Interaction Patterns

| Pattern | Behavior |
|---------|----------|
| Voice activation | Push-to-talk OR always-on with VAD |
| Video toggle | One-click camera/screen on-off |
| Source switching | Click video cell to focus, drag to reorder |
| Knowledge query | Type in chat OR voice: "Search [topic]" |
| TIER promotion | Drag document to TIER panel |
| Model switching | Quick-switch via ControlBar dropdown |
| Session management | Sidebar: create, resume, archive, delete |
