# AGENTS.md — EMS Training Platform Coding Agent Guide

## 🧠 System Overview

This project is an **ALS/BLS Emergency Training Simulation Platform**.

⚠️ **Critical Constraint**:  
This is **NOT a medical system**. It is a **training simulator only**.

The system simulates emergency scenarios using:
- Deterministic engines (rules, scoring, physiology)
- Structured medical protocols (versioned)
- AI (LLM) for **narration only — never decision-making**

---

## 🧩 Core Architecture Principles

### 1. Strict Separation of Responsibilities

| Layer | Responsibility | Technology | Rules |
|------|--------|-----------|------|
| Rule Engine | Determines correctness, scoring, deterioration | Node.js (pure TS) | ❌ No AI |
| Protocol Engine | Validates protocol structure and versions | PostgreSQL + TS | Deterministic |
| Simulation Engine | State machine (patient, time, flow) | TS | Deterministic |
| AI Layer | Narration, debrief text | llama.cpp | ❌ No decisions |
| Authoring Tools | Build cases/protocols | UI + TS | AI assists language only |

---

### 2. Director–Actor Pattern

- **Director (System Engine)** → decides EVERYTHING:
  - correctness
  - patient state
  - scoring
  - simulation outcome

- **Actor (LLM)** → ONLY describes:
  - patient condition
  - environment
  - debrief summary

❌ The LLM must NEVER:
- choose protocols
- modify vitals
- assign scores
- trigger rules

---

## 🧱 Monorepo Structure

```
apps/
  web/        → Next.js frontend
  api/        → Fastify backend

packages/
  simulation-engine/   → core logic (state machine)
  protocol-engine/     → protocol validation
  ai-client/           → LLM wrapper (safe)
  db/                  → Drizzle ORM schemas
  shared-types/        → Zod schemas

infra/
  docker-compose
  Caddy config
```

---

## ⚙️ Tech Stack (Locked)

### Frontend
- Next.js 16
- TypeScript (strict)
- Tailwind v4
- shadcn/ui
- Zustand
- TanStack Query
- socket.io-client

### Backend
- Node.js 24
- Fastify
- Zod
- WebSocket

### Database
- PostgreSQL 17
- Drizzle ORM
- Redis (state + cache)

### AI (Local Only)
- llama.cpp
- Qwen2.5-7B (primary)
- No internet access (network isolated)

---

## 📦 Core Domain Models

### ProtocolTemplate
- Versioned medical workflow
- Contains:
  - phases
  - required/optional/wrong actions
  - success criteria

⚠️ Never mutate published versions

---

### CaseTemplate
- Scenario definition
- Includes:
  - story
  - patient state
  - protocol options
  - rules (deterioration logic)

---

### Rule System

Rules define cause → effect:

```ts
trigger → conditions → effects
```

Effects may include:
* vital changes
* symptoms
* score updates
* simulation end

⚠️ Rules are ALWAYS deterministic

---

### SimulationRun

Stores:
* full event log
* timestamps
* score breakdown
* mistakes

Used for:
* debrief
* analytics

---

## 🔄 Simulation Flow (Authoritative)

```
User Action →
WebSocket →
Fastify →
SimulationEngine →

  → ProtocolValidator
  → PhysiologyModel
  → RuleEngine
  → ScoreEngine
  → EventLogger (DB)

→ (optional) AI narration

→ WebSocket → UI update
```

⚠️ AI is NOT in the decision path

---

## 🧠 AI Usage Rules (CRITICAL)

### Allowed
* Narration ("describe patient condition")
* Debrief summaries
* Trainer assistance (text generation)

### Forbidden
* Medical decisions
* Protocol selection
* Scoring
* State mutation

### Input Constraints
* AI receives **structured JSON only**
* No PII / PHI
* No free-text medical queries

---

## 🔐 Security Constraints

* JWT + RBAC enforced everywhere
* Zod validation on ALL inputs
* No PHI sent to AI
* LLM runs in isolated container (no egress)
* Audit logs for all changes

---

## 🧪 Development Rules

### DO
* Use **pure functions** in simulation engine
* Validate everything with Zod
* Version all protocols and cases
* Write unit tests for:
  * RuleEngine
  * ScoreEngine
  * PhysiologyModel

---

### DO NOT
* ❌ Use AI inside core logic
* ❌ Store free-text scenarios (must be structured)
* ❌ Use RAG in simulation runtime
* ❌ Mutate published protocol versions
* ❌ Auto-train models from user data

---

## 🧩 Key Modules (MVP)

* Auth / RBAC
* Protocol Registry
* Case Authoring
* Simulation Engine (WebSocket)
* Analytics
* AI Assist (safe wrapper)

---

## 📈 Difficulty System

Handled by **PerformanceAdapter**:

| Level | Description             |
| ----- | ----------------------- |
| 1     | Clean protocol training |
| 2     | Noise & distractions    |
| 3     | Ambiguous real-world    |

⚠️ Deterministic — NOT AI-driven

---

## 🧯 Failure Handling

* AI failure → simulation continues without narration
* Invalid case → blocked at validation
* Rule conflicts → deterministic resolution

---

## 🚀 Deployment Constraints

* Docker Compose (single server)
* Resource limits:
  * LLM ≤ 8GB RAM
  * API ≤ 512MB
* Observability:
  * Prometheus
  * Grafana
  * Loki

---

## ⚠️ Legal & Safety

* This system is for **training only**
* Not medical advice
* All protocols must be approved
* Full audit trail required

---

## 🧭 Agent Behavior Guidelines

When working on this codebase:

1. Prefer **deterministic logic over heuristics**
2. Never introduce AI into decision-making paths
3. Keep domain models **strict and typed**
4. Respect **versioning invariants**
5. Optimize for **clarity and auditability**, not cleverness

---

## ✅ Definition of Done

A feature is complete when:

* ✅ Fully typed (TS strict)
* ✅ Validated (Zod)
* ✅ Tested (unit tests where applicable)
* ✅ Logged (if affecting simulation/protocols)
* ✅ Safe (no AI misuse)

---

## 🧠 Mental Model Summary

> The system is a **game engine for emergency medicine training**
> NOT an AI system.

* Engine = truth
* AI = storyteller

Never mix them.
