# Olympus

Claude(Athena)를 중심으로 GPT Codex(Hephaestus)와 Gemini(Argus)를 협업시키는
멀티모델 에이전트 오케스트레이션 시스템.

파일 기반 계약(TP/RP)으로 에이전트 간 소통하며, **API 키 없이 CLI 구독만으로 동작**합니다.

```
사용자 (기획자)
    │
    ▼
  Athena (Claude Code)        ← 기획 · 설계 · 검토 · 라우팅
    │               │
    ▼               ▼
Hephaestus      Argus
(Codex CLI)     (Gemini CLI)
코드 구현         이미지 분석 · 생성
테스트 · 빌드      문서 OCR · 리서치
```

---

## 요구사항

| 도구 | 목적 | 설치 |
|------|------|------|
| [Claude Code](https://claude.ai/code) | Athena (Brain) | Claude Pro/Team 구독 |
| [Codex CLI](https://openai.com/codex) | Hephaestus (코드) | ChatGPT Pro 구독 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Argus (비전) | `npm install -g @google/gemini-cli` |
| coreutils | timeout 호환 | `brew install coreutils` (macOS) |

---

## 설치

### 원격 설치 (권장)

```bash
curl -fsSL https://raw.githubusercontent.com/axseungpyo/olympus/main/install.sh | bash
```

> 보안이 걱정된다면 먼저 스크립트를 확인하세요:
> ```bash
> curl -fsSL https://raw.githubusercontent.com/axseungpyo/olympus/main/install.sh | less
> ```

### 로컬 설치

```bash
git clone https://github.com/axseungpyo/olympus.git
cd olympus
bash install.sh
```

설치 후 터미널을 재시작하거나:
```bash
source ~/.zshrc   # zsh
source ~/.bashrc  # bash
```

---

## 빠른 시작

### 새 프로젝트 생성

```bash
olympus new my-project
cd my-project
# Claude Code로 이 디렉토리를 열면 Athena가 활성화됩니다
```

### 첫 사이클 실행

Claude Code 세션에서:

```
/plan "만들고 싶은 기능 설명"
```

→ TP-001.md가 생성되면:

```
/delegate TP-001
```

→ Hephaestus가 코드 구현 후 RP-001.md를 반환하면:

```
/review RP-001
```

---

## 핵심 개념

### 에이전트 판테온

| 에이전트 | 실체 | 역할 |
|---------|------|------|
| **Athena** | Claude Code | 기획 · 설계 · 검토 · 오케스트레이션 |
| **Hephaestus** | Codex CLI | 코드 구현 · 테스트 · 리팩토링 |
| **Argus** | Gemini CLI | 이미지 분석 · 생성 · OCR · 리서치 |

### 파일 계약

에이전트는 대화하지 않고 파일로 소통합니다.

```
artifacts/handoff/TP-001.md   ← Athena가 Hephaestus/Argus에게 보내는 작업 지시
artifacts/handoff/RP-001.md   ← Hephaestus/Argus가 Athena에게 보내는 결과 보고
artifacts/INDEX.md            ← 전체 작업 상태 추적 (SSoT)
shared/context.md             ← 프로젝트 공유 맥락
```

### 모드 시스템

```
Athena:      Glance[Haiku] / Insight[Sonnet] / Oracle[Opus]
Hephaestus:  Ember[Low] / Flame[Medium] / Blaze[High] / Inferno[xHigh]
Argus:       Glimpse[Flash-Lite] / Gaze[3.1 Pro] / Vision[Pro Image]
```

---

## Skills 목록

| 명령어 | 기능 |
|--------|------|
| `/plan` | TASK_PACKET(TP) 생성 |
| `/delegate TP-NNN` | Hephaestus(Codex)에 코드 작업 위임 |
| `/delegate-gemini TP-NNN` | Argus(Gemini)에 비전/생성 작업 위임 |
| `/chain "요청"` | Argus 분석 → Hephaestus 구현 체인 |
| `/review RP-NNN` | RESULT_PACKET 검토 및 판정 |
| `/digest` | 프로젝트 맥락 압축 업데이트 |
| `/status` | 현재 작업 현황 보고 |
| `/init` | 새 프로젝트 아티팩트 구조 초기화 |

---

## CLI 명령어

```bash
olympus new <name>   # 새 프로젝트 생성
olympus new .        # 현재 디렉토리에 Olympus 구조 추가
olympus update       # Skills 최신 버전으로 업데이트
olympus doctor       # 설치 상태 진단
```

---

## 프로젝트 구조

```
my-project/
├── CLAUDE.md                  # Athena 헌법 (Claude Code가 자동 로드)
├── AGENTS.md                # 에이전트 규칙서 + TP/RP 포맷
├── .claude/
│   ├── settings.json          # PostToolUse 로깅 Hooks
│   └── skills/                # (글로벌 설치 후 불필요)
├── artifacts/
│   ├── INDEX.md               # 작업 상태 추적 (Chronicle)
│   ├── handoff/               # TP/RP 교환소
│   ├── plans/DECISIONS.md     # 설계 결정 기록
│   └── logs/
├── shared/context.md          # 프로젝트 맥락 (Lore)
├── scripts/
│   └── delegate-gemini.sh     # Argus 실행 래퍼
└── src/                       # 코드 (Hephaestus 관할)
```

---

## 업데이트

Skills 업데이트:
```bash
olympus update
```

전체 재설치:
```bash
curl -fsSL https://raw.githubusercontent.com/axseungpyo/olympus/main/install.sh | bash
```

---

## 라이선스

MIT License — 자세한 내용은 [LICENSE](LICENSE) 참조.
