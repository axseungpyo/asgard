# Asgard Lore — Project Context

Last updated: 2026-03-12

## Project Summary

Asgard는 Claude(Odin)를 중심으로 GPT Codex(Brokkr)와 Gemini(Heimdall)를 협업시키는
멀티모델 에이전트 오케스트레이션 시스템이다.
파일 기반 계약(Rune/Saga)으로 에이전트 간 소통하며, API 키 없이 CLI 구독만으로 동작한다.

**대시보드(Yggdrasil)**를 통해 자연어 한 마디로 AI 에이전트를 자율적으로 오케스트레이션하는
cowork 경험을 제공한다.

## Current Version

**v1.0.0** — Plan A (Control Panel) + Plan B (AI Brain) 완료

## Current Phase

모든 핵심 기능 구현 완료. 실전 사용 + 안정화 단계.

## Architecture — Clean Architecture

```
src/yggdrasil/server/
├── core/                       ← 순수 도메인 (외부 의존 제로)
│   ├── entities/               ← Agent, Task, Skill, Message, Plan, AutonomyLevel
│   ├── ports/                  ← 13개 인터페이스 (Dependency Inversion)
│   ├── use-cases/              ← 비즈니스 규칙 (agent/, task/, odin/, plan/)
│   └── events/                 ← 도메인 이벤트 7종
│
├── adapters/                   ← 인터페이스 어댑터
│   ├── repositories/           ← FileSystem 기반 (Task, Agent, Message, Plan, Settings)
│   ├── gateways/               ← Claude LLM, Regex Fallback, ChildProcess
│   ├── controllers/            ← HTTP 컨트롤러 6개
│   ├── tools/                  ← IToolExecutor 구현 (FileSystem, Skill, Planner)
│   ├── skills/                 ← FileSkillRegistry
│   ├── events/                 ← InProcessEventBus (EventEmitter)
│   ├── filesystem/             ← NodeFileSystem
│   └── stores/                 ← ApprovalStore, AgentProcessRegistry
│
├── routes/                     ← Express 라우터
├── websocket/                  ← WebSocket (status, odin, terminal)
├── infra/                      ← auth, logger, watcher
├── di/container.ts             ← Simple Factory DI
└── index.ts                    ← 엔트리포인트
```

## Tech Stack

- **Brain**: Claude Code (Claude Sonnet/Opus/Haiku) + Anthropic API SDK
- **Hands-Code**: Codex CLI (GPT-5.4, reasoning effort 조절)
- **Hands-Vision**: Gemini CLI (Gemini 3.1 Pro / Flash / Pro Image)
- **Server**: Express + Next.js App Router, port 7777
- **Dashboard**: React + Tailwind CSS + Next.js App Router
- **DI**: Simple Factory (no framework)
- **Events**: InProcessEventBus (Node.js EventEmitter)
- **Tests**: Vitest (73 tests, 15 files)

## Key Architecture Decisions

1. Python 오케스트레이터 없음 — Claude Code 네이티브 (Skills + Hooks)
2. Rune/Saga 포맷은 .md 단일화
3. Hook은 PostToolUse 비블록 로깅만 (PreToolUse block 금지)
4. 북유럽 신화 테마 (Odin/Brokkr/Heimdall)
5. Codex 동기 실행 → `codex exec --full-auto`
6. Yggdrasil: Express + Next.js 단일 서버
7. WebSocket 분리 (status/odin/terminal)
8. Night Sky 테마 + Dark/Light 모드
9. Clean Architecture (core/ports → adapters → di)
10. Simple Factory DI (no DI framework)

## Core Ports (13 interfaces)

| Port | 역할 |
|------|------|
| ITaskRepository | 태스크 CRUD + TP 번호 관리 |
| IAgentRepository | 에이전트 상태/PID 관리 |
| IMessageRepository | Odin 메시지 영속화 (JSONL) |
| ILLMGateway | LLM API 호출 (Claude + Regex fallback) |
| IProcessGateway | CLI 프로세스 spawn/kill/monitor |
| ISkillRegistry | Skill 매칭/실행 |
| IToolExecutor | LLM Tool 실행 체인 패턴 |
| IFileSystem | 파일시스템 추상화 |
| IEventBus | 도메인 이벤트 pub/sub |
| IPlanRepository | 실행 계획 저장/조회 |
| ISettingsRepository | 자율 레벨 등 설정 |
| IApprovalStore | 승인 대기 관리 |
| IAgentProcessRegistry | 실행 중 프로세스 추적 |

## Domain Events (7 types)

| Event | 트리거 |
|-------|--------|
| agent.started | 에이전트 프로세스 시작 |
| agent.stopped | 에이전트 프로세스 종료 |
| agent.progress | 에이전트 실행 진행률 (stdout 기반) |
| task.created | 새 태스크 생성 |
| task.status_changed | 태스크 상태 변경 |
| command.processed | Odin 명령 처리 완료 |
| tool.executed | LLM Tool 실행 완료 |
| plan.progress | 실행 계획 진행 상태 |
| context.shared | 에이전트 간 컨텍스트 전달 |
| file.changed | 파일 시스템 변경 감지 |

## LLM Tools (13 tools)

| Tool | 용도 | 승인 |
|------|------|------|
| get_status | 프로젝트 현황 조회 | - |
| create_task | TP 생성 | - |
| validate_task | TP 포맷 검증 | - |
| delegate_task | 에이전트 위임 | 필요 |
| stop_agent | 에이전트 중지 | 필요 |
| ask_user | 사용자 질문 | - |
| read_file | 파일 읽기 (10KB 제한) | - |
| write_file | 파일 쓰기 | 필요 |
| list_directory | 디렉토리 탐색 | - |
| search_codebase | 코드 검색 (50건 제한) | - |
| review_saga | RP 검토 | - |
| create_plan | 멀티스텝 실행 계획 생성 | - |
| get_plan_status | 계획 진행 조회 | - |

## Dashboard — Cowork Layout

```
┌── Team Panel (좌) ──┐  ┌── Main (우) ─────────────────────┐
│ ● Odin [Brain]       │  │ AutonomySelector (L1/L2/L3)     │
│ ● Brokkr [Code]      │  │ ActiveWork (진행 중 TP + 진행바) │
│ ● Heimdall [Eye]     │  │ OdinThinking (AI 사고 과정)      │
└──────────────────────┘  │ PlanProgress (계획 진행률)        │
                          │ ChatPanel (대화 + 승인)           │
                          └───────────────────────────────────┘
```

## Key File Locations

| 파일 | 역할 |
|------|------|
| CLAUDE.md | Odin 헌법 (Brain 에이전트 규칙) |
| AGENTS.md | Brokkr/Heimdall 규칙 + Rune/Saga 포맷 |
| artifacts/INDEX.md | 작업 상태 SSoT (TP-001~030, 다음: TP-031) |
| artifacts/handoff/ | Rune(TP)/Saga(RP) 교환소 |
| artifacts/plans/DECISIONS.md | 설계 결정 기록 (10개) |
| artifacts/plans/PLAN-B-AI-BRAIN.md | Plan B 전체 설계 문서 |
| shared/context.md | 이 파일 (공유 맥락) |
| src/yggdrasil/server/index.ts | 서버 엔트리포인트 |
| src/yggdrasil/server/di/container.ts | DI 컨테이너 |
| src/yggdrasil/dashboard/app/page.tsx | 대시보드 메인 |
| scripts/delegate-codex.sh | Brokkr CLI 래퍼 |
| scripts/delegate-gemini.sh | Heimdall CLI 래퍼 |

## Completed Plans

| Plan | 범위 | TP | 버전 |
|------|------|----|------|
| Plan A | Control Panel (대시보드 기능) | TP-001~015 | v0.5.4 |
| Plan C | 코드 구조 리팩토링 | TP-016~019 | v0.5.4 |
| Plan B0 | Clean Architecture 기반 | TP-020~021 | v0.6.1 |
| Plan B1-2 | LLM Gateway + Event Bus | TP-022~023 | v0.7.1 |
| Plan B3 | Tool Use + Safety | TP-024~025 | v0.8.1 |
| Plan B4 | Planner + Autonomy UI | TP-026~027 | v0.9.1 |
| Plan B5 | 병렬 실행 + 컨텍스트 공유 | TP-028~029 | v0.9.3 |
| Plan B6 | Cowork Dashboard | TP-030 | v1.0.0 |

## Active Constraints

- .gitignore가 src/ 차단 → 새 파일은 `git add -f` 필요
- Codex sandbox에서 포트 바인딩 불가 → 서버 기동 검증은 수동
- `next build`와 dev server 동시 실행 금지 → tsc --noEmit으로 검증
- 서버 시작: `cd src/yggdrasil && YGGDRASIL_AUTH=false npx tsx server/index.ts`
- 서버 포트: 7777
