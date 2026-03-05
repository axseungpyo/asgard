---
name: delegate-gemini
description: >
  Argus(Gemini CLI)에게 TASK_PACKET을 전달하여 비전/생성 작업을 위임한다.
  "gemini", "Argus", "이미지 분석", "이미지 생성", "스크린샷 분석",
  "PDF 분석", "문서 OCR", "웹 리서치", "비전 작업" 등에 트리거.
  Agent Target이 "gemini"인 TP에 사용.
allowed-tools: Read, Write, Bash, Glob
---

# /delegate-gemini — Argus(Gemini) 실행 위임

## 역할

비전(이미지/영상 분석), 이미지 생성/편집, 대규모 문서 처리, 웹 리서치 등
Argus(Gemini CLI)의 멀티모달 능력이 필요한 작업을 위임한다.

## 실행 절차

### Step 1: TP 검증

`$ARGUMENTS`에서 TP ID 파싱 (예: `TP-008`).

확인 사항:
- `artifacts/handoff/TP-NNN.md` 존재 여부
- `Agent Target`이 `gemini`인지 확인
- INDEX.md status가 `draft` 또는 `ready`인지 확인

### Step 2: 입력 파일 확인

TP의 `Multimodal Input` 섹션 확인:
- 이미지 파일이 명시된 경우 해당 경로 존재 확인
- 문서 파일이 명시된 경우 해당 경로 존재 확인
- 파일 없으면 사용자에게 알리고 중단

### Step 3: Gaze Focus Mode 결정

TP의 Vision Task 유형:
| Vision Task | Argus Mode | 비고 |
|-------------|-----------|------|
| analyze, ocr | Gaze (3.1 Pro) | 기본값 |
| analyze (대량 파일) | Glimpse (Flash-Lite) | 빠른 분류 |
| generate, edit | Vision (Pro Image) | 이미지 생성 |
| screenshot-to-code | Gaze (3.1 Pro) | 분석 후 Codex 체인 |

### Step 4: INDEX.md 상태 업데이트

status: `draft` -> `in-progress`, Updated: {datetime}

### Step 5: Argus 소환

`scripts/delegate-gemini.sh`를 통해 실행:

```bash
# 텍스트/문서 작업
bash scripts/delegate-gemini.sh TP-NNN

# 이미지 입력이 있는 작업
bash scripts/delegate-gemini.sh TP-NNN --input {image-path}
```

실행 중 상태 메시지:
```
Argus[{Mode}] 천 개의 눈 활성화: TP-NNN 분석 중...
```

### Step 6: 결과 확인

스크립트 완료 후:
- `artifacts/handoff/RP-NNN.md` 존재 확인
- 없으면: INDEX.md status -> `blocked`
- 있으면: INDEX.md status -> `review-needed`

### Step 7: 완료 보고

```
Argus[{Mode}] 관측 완료: RP-NNN

검토 준비 완료. 다음: /review RP-NNN
```

## 오류 처리

**Gemini 미설치:**
```
Argus를 찾을 수 없습니다.
설치: npm install -g @google/gemini-cli
인증: gemini 실행 후 Google 계정 로그인
```

**API 할당량 초과 (무료 티어):**
```
Argus API 할당량 초과. 옵션:
1. 잠시 후 재시도 (60 req/min, 1000 req/day 한도)
2. GOOGLE_API_KEY 환경 변수로 유료 전환
3. 작업을 더 작은 단위로 분할
```

**TP Agent Target이 gemini가 아닌 경우:**
```
이 TP는 Hephaestus(Codex) 작업입니다.
/delegate TP-NNN을 사용하세요.
```
