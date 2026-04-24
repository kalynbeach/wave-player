# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that implements a sophisticated web-based audio player called "WavePlayer". The application uses Web Audio API, Web Workers, and AudioWorklets to handle high-performance audio processing and playback.

## Key Commands

- `bun run dev` - Run development server (builds worker/worklet first, then starts Next.js with Turbopack)
- `bun run build` - Production build (builds worker/worklet first, then Next.js build)
- `bun run build:turbo` - Production build with Turbopack
- `bun run start` - Start production server
- `bun run lint` - Run Next.js linting
- `bun run test` - Run tests with Vitest
- `bun run build:wave-player` - Build both worker and worklet (prerequisite for dev/build)
- `bun run build:worker` - Build the Web Worker only
- `bun run build:worklet` - Build the AudioWorklet only

## Architecture

### Core Audio System
The WavePlayer consists of three main components working together:

1. **Main Thread Context** (`contexts/wave-player-context.tsx`): React context that manages state and communicates with the Web Worker
2. **Web Worker** (`lib/wave-player/worker/wave-player.worker.ts`): Handles audio fetching, decoding, and buffer management using SharedArrayBuffer
3. **AudioWorklet Processor** (`lib/wave-player/worklet/wave-player.processor.ts`): Real-time audio processing in the audio thread

### Shared Memory Architecture
- Uses SharedArrayBuffer for zero-copy audio data sharing between threads
- RingBuffer implementation for efficient audio streaming
- Atomic operations for thread-safe state management

### Build System
- Custom build scripts (`scripts/build-worker.ts`, `scripts/build-worklet.ts`) using Bun
- Worker and worklet are built separately and output to `public/workers/` and `public/worklets/`
- **Important**: Worker and worklet must be built before running dev/build commands

### File Structure
```
app/                  # Next.js App Router
├── layout.tsx        # Root layout
├── page.tsx          # Home page
└── globals.css       # Global styles

components/           # React components
├── ui/               # Reusable UI components (Radix-based)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dropdown-menu.tsx
│   └── slider.tsx
├── theme/            # Theme management
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── wave-player.tsx   # Main WavePlayer component
├── wave-player-track-controls.tsx  # Playback controls
├── wave-player-track-info.tsx      # Track information display
└── wave-player-track-visual.tsx    # Audio visualization

contexts/             # React contexts
└── wave-player-context.tsx    # Main audio state management

hooks/                # Custom React hooks
├── use-audio-context.ts
└── use-wave-player.ts         # Re-exports from context

lib/                  # Core library code
├── utils.ts          # Utility functions
└── wave-player/      # WavePlayer implementation
    ├── worker/       # Web Worker implementation
    │   ├── wave-player.worker.ts    # Main worker
    │   ├── audio-fetcher.ts         # HTTP audio fetching
    │   ├── audio-decoder.ts         # WebCodecs audio decoding
    │   ├── audio-cache.ts           # Audio buffer caching
    │   ├── audio-analyzer.ts        # Audio analysis (Meyda)
    │   └── ring-buffer.ts           # Shared memory buffer
    ├── worklet/      # AudioWorklet implementation
    │   └── wave-player.processor.ts # Real-time audio processor
    └── types/        # TypeScript definitions
        ├── wave-player.d.ts         # Core types
        └── worker-messages.d.ts     # Worker message types

scripts/              # Build scripts
├── build-worker.ts   # Web Worker build script
└── build-worklet.ts  # AudioWorklet build script

docs/                 # Documentation
├── wave-player.md
├── wave-player-audio.md
├── webcodecs-api.md
└── NOTES.md
```

### Key Technologies
- **Bun**: Runtime and package manager
- **Next.js 15**: React framework with Turbopack
- **Web Audio API**: Audio processing and playback
- **Web Workers**: Background audio processing
- **AudioWorklets**: Real-time audio processing
- **WebCodecs API**: Hardware-accelerated audio decoding
- **SharedArrayBuffer**: Zero-copy memory sharing
- **Meyda**: Audio feature extraction
- **Vitest**: Testing framework
- **Tailwind CSS**: Styling
- **Radix UI**: UI component primitives

## Development Notes

### Worker/Worklet Development
- Always rebuild worker/worklet after changes: `bun run build:wave-player`
- Worker outputs to `public/workers/wave-player.js`
- Worklet outputs to `public/worklets/wave-player.processor.js`
- Both have separate TypeScript configurations (`tsconfig.worker.json`, `tsconfig.worklet.json`)

### Audio Context Configuration
- Configured for low-latency interactive audio (`latencyHint: "interactive"`)
- Default sample rate: 48kHz
- Uses SharedArrayBuffer for efficient audio data sharing

### State Management
- Complex state management using React Context with useReducer
- Status tracking includes: initializing, idle, loading, buffering, ready, playing, paused, seeking, ended, stopped, error
- Real-time communication between main thread, worker, and worklet

### Testing
- Uses Vitest for testing
- Testing Library for React components
- No specific test runner script - use `bun run test`

## Code Conventions

- Uses TypeScript with strict type checking
- Prettier configured with Tailwind plugin
- ESLint with Next.js configuration
- Prefer Bun over npm/yarn for package management
- Audio-related code uses detailed console logging for debugging
- Worker/worklet code includes comprehensive error handling