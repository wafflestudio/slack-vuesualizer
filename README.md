# Slack Vuesualizer

<img alt="Slack" width="250" height="250" src="./public/Slack_Mark.svg"/>

Slack Export 데이터를 웹에서 탐색, 검색, 공유하기 위한 뷰어입니다.

![Screenshot](./public/screenshot.png)

- Original project: https://github.com/4350pChris/slack-vuesualizer

## 변경사항

한국어 지원 추가, 정규표현식 검색 추가, 검색결과 정렬 추가, 검색결과 및 채널 메시지 페이지네이션(무한 스크롤) 추가했습니다.

## 주요 기능

- Slack 메시지/사용자/파일 조회
- 채널 단위 대용량 메시지 탐색
- 전체 텍스트 검색 및 정규표현식 검색
- 검색 결과 정렬
- 검색 결과/채널 메시지 무한 스크롤 페이지네이션
- 다국어 지원(English, Deutsch, 한국어)

## 빌드 가이드

### 1) 개발 환경 실행

사전 준비:

- Node.js 22
- pnpm (corepack 사용 권장)
- Docker (로컬 MongoDB 실행 시)

의존성 설치:

```bash
corepack enable
pnpm install
```

로컬 MongoDB 실행:

```bash
docker compose -f docker-compose.dev.yml up -d
```

개발 서버 실행:

```bash
pnpm dev
```

### 2) 프로덕션 빌드

```bash
pnpm build
pnpm preview
```

## 배포 가이드

### A. Docker Compose로 배포 (권장)

이 저장소의 docker-compose.yml을 그대로 사용하면 앱 + MongoDB(+ mongo-express)를 함께 실행할 수 있습니다.

```bash
docker compose up -d
```

기본 접속:

- App: http://localhost:3000
- Mongo Express: 기본 포트 미노출 (필요 시 compose 파일에서 포트 매핑 추가)

### B. 로컬에서 이미지 빌드 후 배포

```bash
docker build -t slack-vuesualizer:local .
docker run -d \
	--name slack-vuesualizer \
	-p 3000:3000 \
	-e NUXT_MONGODB_URI='mongodb://root:example@<mongo-host>:27017' \
	slack-vuesualizer:local
```

## 환경 변수

필수:

- NUXT_MONGODB_URI: MongoDB 연결 문자열

선택:

- NUXT_PUBLIC_DEMO_WORKSPACE_TOKEN
- NUXT_PUBLIC_CANONICAL_HOST
- NUXT_PUBLIC_VERSION
- NUXT_PUBLIC_BUILD_DATE

