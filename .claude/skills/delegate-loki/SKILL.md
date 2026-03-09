---
name: delegate-loki
description: >
  Loki에게 Rune(TP)을 전달하여 이미지 생성 작업 인프라를 위임한다.
  "delegate-loki", "Loki", "이미지 에이전트", "image gen", "그림 생성 위임"
  등에 트리거. Agent Target이 "codex"이고 Loki mock 인프라 TP일 때 사용.
allowed-tools: Read, Write, Bash, Glob
---

# /delegate-loki — Loki 실행 위임

## 역할

Loki 이미지 생성 에이전트의 위임 인프라를 실행한다.
현재는 실제 이미지 API 없이 mock 실행만 수행한다.

## 실행 절차

### Step 1: TP 검증

`$ARGUMENTS`에서 TP ID 파싱 (예: `TP-013`).

확인 사항:
- `artifacts/handoff/TP-NNN.md` 존재 여부
- Loki 관련 TP인지 확인
- `artifacts/INDEX.md` status가 `draft` 또는 `ready`인지 확인

### Step 2: INDEX.md 상태 업데이트

status: `draft` -> `in-progress`, Updated: {datetime}

### Step 3: Loki 소환

아래 명령으로 Loki 래퍼를 실행한다:

```bash
bash scripts/delegate-loki.sh TP-NNN
```

실행 중 상태 메시지:
```
Loki[Sketch] 환영 점화: TP-NNN mock image task running...
```

### Step 4: Saga(RP) 확인

스크립트 완료 후:
- `artifacts/handoff/RP-NNN.md` 존재 확인
- 없으면: INDEX.md status -> `blocked`
- 있으면: INDEX.md status -> `review-needed`

### Step 5: 완료 보고

```
Loki[Sketch] Saga 도착: RP-NNN

검토 준비 완료. 다음: /review RP-NNN
```

## Loki 모드

| 작업 성격 | Loki Mode | 비고 |
|----------|-----------|------|
| 빠른 초안/placeholder | Sketch [Fast] | 현재 기본 mock 흐름 |
| 정밀 이미지 생성 | Canvas [Standard] | 실제 API 연동 후 사용 예정 |

## 현재 제한

- 실제 이미지 생성 API는 연결되지 않았다.
- 생성 결과는 placeholder image reference만 RP에 기록된다.
- 추가 패키지나 자격 증명 없이 동작한다.
