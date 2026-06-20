# 🧠 The Concept Check — Interface

> A diagnostic tool that tests whether learners can **derive** the concept of "interface" from first principles, not just recognise it.

Built for the [100xEngineers Hackathon — Track A](https://github.com/100xEngineers).

---

## The Problem

Learners who pass a standard concept-check ("What is an interface? Give an example.") often **cannot derive it under one sharp follow-up**. They recognise the word but haven't internalised the structure beneath it. This tool diagnoses exactly *where* their derivation breaks using the SOLO taxonomy, then names the gap and stays silent — letting the learner close it themselves.

See [`HYPOTHESIS.md`](./HYPOTHESIS.md) for the full hypothesis, grounding data, and kill-number.

## How It Works

```
Learner speaks/types → Transcribe (Groq Whisper) → Verify against answer key
                                                        ↓
                                              Deterministic Engine
                                           (compute seam, decide action)
                                                        ↓
                                              Probe / Name gap / Complete
                                                        ↓
                                            LLM generates question (Groq)
                                                        ↓
                                              Learner responds → loop
```

The system has **three layers**, strictly separated:

| Layer | Decides | Located |
|-------|---------|---------|
| **Deterministic Engine** (`src/`) | What rung the learner reached, where the seam is, what to do next | Pure TypeScript, no I/O |
| **Supabase Edge Functions** (`supabase/functions/`) | How to call the LLM, transcribe audio, persist state | Deno, Groq API, Supabase DB |
| **Web Frontend** (`web/`) | How to present the conversation and capture voice/text | React + Vite |

The LLM (Groq) is used **only** for:
- Transcribing audio (Whisper)
- Verifying learner answers against the answer key
- Generating Socratic follow-up questions
- Judging whether a gap-close is real or fake

The LLM **never** decides what to do next. That logic is fully deterministic.

## Architecture

```
├── src/                          # Deterministic engine (pure logic)
│   ├── types.ts                  # Session, VerifierResult, Action types
│   ├── answerKey.ts              # Frozen answer key, SOLO ladder, forbidden words
│   ├── engine.ts                 # computeSeam, applyVerifier, nextAction, recordClose
│   └── index.ts                  # Public API barrel
│
├── supabase/
│   ├── functions/                # Deno Edge Functions
│   │   ├── session/              # POST: create a new diagnostic session
│   │   ├── transcribe/           # POST: audio → text (Groq Whisper)
│   │   ├── verify/               # POST: verify learner answer against answer key
│   │   ├── question/             # POST: generate next Socratic question
│   │   ├── close-judge/          # POST: judge real vs fake close
│   │   └── _shared/              # CORS, Groq client, prompts, Supabase client
│   └── migrations/               # SQL: tables, RLS policies, storage bucket
│
├── web/                          # React + Vite frontend
│   └── src/
│       ├── components/           # UI components (RecorderDock, DialogueThread, etc.)
│       ├── lib/                  # API client, Supabase client, types
│       └── state/                # useDiagnostic hook (session state machine)
│
├── test/                         # Engine unit tests + RLS isolation test
├── HYPOTHESIS.md                 # The hypothesis, grounding, and kill-number
└── .env.example                  # Required environment variables
```

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for deploying Edge Functions)
- A [Groq](https://console.groq.com/) API key
- A Supabase project

### 1. Clone & install

```bash
git clone https://github.com/Youwe1412/100xEngineers-Hackathon-Track-A-The-Concept-Check.git
cd 100xEngineers-Hackathon-Track-A-The-Concept-Check

# Install engine dependencies
npm install

# Install frontend dependencies
cd web && npm install && cd ..
```

### 2. Environment variables

```bash
# Root — for engine tests / local dev
cp .env.example .env
# Add your GROQ_API_KEY

# Frontend
cp web/.env.example web/.env
# Add your Supabase URL and anon key
```

### 3. Deploy Supabase

```bash
# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Set Edge Function secrets
supabase secrets set GROQ_API_KEY=gsk_...

# Deploy all Edge Functions
supabase functions deploy
```

### 4. Run the frontend

```bash
cd web
npm run dev
```

### 5. Run engine tests

```bash
npm test
```

## Key Concepts

| Term | Meaning |
|------|---------|
| **SOLO rung** | The learner's level of understanding (prestructural → extended_abstract) |
| **Seam** | The first gap in the learner's derivation, checked in ladder order |
| **Probe** | A Socratic question targeting the seam, without revealing the answer |
| **Real close** | The learner generates a new, correct derivation in their own words |
| **Fake close** | The learner nods, repeats, or only derives after being told the answer |
| **Answer key** | The fixed reference for "interface" — relational core + 4 pillars |

## License

MIT
