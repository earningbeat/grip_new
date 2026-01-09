# Valuation Re-rating Tracker

> Gap Ratio 기반 밸류에이션 리레이팅 후보 종목을 빠르게 포착하는 도구

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

## 🎯 목적

- **밸류에이션 리레이팅(멀티플 재평가)** 가능성이 높은 종목을 빠르게 포착
- 1단계에서는 원인 분석(가이던스/업그레이드)은 제외하고, **격차(괴리)만으로 후보군 정렬**

## 📊 핵심 지표

| 지표 | 공식 | 의미 |
|------|------|------|
| **Gap Ratio** | NTM EPS ÷ TTM EPS | 1보다 클수록 미래 이익 성장이 가파름 |
| **Forward P/E** | Price ÷ NTM EPS | 향후 12개월 예상 이익 기준 밸류에이션 |
| **Delta P/E** | TTM P/E − Forward P/E | 양수일수록 리레이팅 가능성 ↑ |
| **NTM EPS** | FY1 × (잔여개월/12) + FY2 × (1-잔여개월/12) | 근사 NTM EPS (Rolling 12개월) |

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/rerating-tracker.git
cd rerating-tracker
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성:

```env
# Financial Modeling Prep API Key (필수)
# https://financialmodelingprep.com/developer/docs/ 에서 무료 API 키 발급
FMP_API_KEY=your_api_key_here

# Cron 엔드포인트 보안 (선택)
CRON_SECRET=your_secret_here

# Vercel KV (선택)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## 📁 프로젝트 구조

```
/rerating-tracker
├── /app                    # Next.js App Router
│   ├── /api
│   │   ├── /cron/update   # Cron Job 엔드포인트
│   │   └── /ranking       # 랭킹 데이터 API
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   └── globals.css        # 글로벌 스타일
│
├── /components            # React 컴포넌트
│   ├── RankingTable.tsx   # 랭킹 테이블
│   └── MetadataCard.tsx   # 메타데이터 카드
│
├── /lib                   # 핵심 라이브러리
│   ├── /api
│   │   └── fmp.ts         # FMP API 어댑터
│   ├── /calculator
│   │   └── metrics.ts     # 지표 계산 엔진
│   ├── /pipeline
│   │   └── processor.ts   # 데이터 파이프라인
│   └── /utils
│       ├── filters.ts     # 필터링 유틸
│       └── format.ts      # 포맷팅 유틸
│
├── /types                 # TypeScript 타입 정의
├── config.json            # 마스터 설정 파일
└── vercel.json            # Vercel 배포 설정
```

## ⚙️ config.json 설정

모든 설정은 `config.json`에서 관리됩니다:

```json
{
  "logic_thresholds": {
    "min_forward_pe": 1.0,      // 최소 Forward P/E
    "max_forward_pe": 300.0,    // 최대 Forward P/E
    "exclude_negative_eps": true // 음수 EPS 제외
  },
  "output_settings": {
    "ranking_count": 50,        // 상위 N개 표시
    "sort_by": "gap_ratio",     // 정렬 기준
    "sort_order": "desc"        // 내림차순
  }
}
```

## 🔄 데이터 갱신

### 자동 (Vercel Cron)

`vercel.json`에 정의된 스케줄에 따라 자동 갱신:
- **시간**: 평일 22:00 UTC (미국 장 마감 후)

### 수동

```bash
# 로컬에서 수동 갱신
curl http://localhost:3000/api/cron/update

# 프로덕션에서 수동 갱신 (인증 필요)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/update
```

## 🚢 Vercel 배포

### 1. GitHub 연동

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" → GitHub 저장소 연결

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수 추가:
- `FMP_API_KEY`: FMP API 키
- `CRON_SECRET`: Cron 엔드포인트 보안 토큰

### 3. 배포

- `main` 브랜치에 푸시하면 자동 배포

## 🛡️ 필터링 규칙

데이터 품질을 위해 다음 종목은 자동 제외됩니다:

1. **TTM EPS ≤ 0**: P/E 해석 불가
2. **NTM EPS ≤ 0**: Forward P/E 음수
3. **Forward P/E < 1 또는 > 300**: 비정상 밸류에이션
4. **데이터 결측**: 필수 필드 누락

## 📈 로드맵

### Sprint 1 ✅ (현재)
- 유니버스 로더 (S&P 500)
- 데이터 수집 모듈
- NTM 근사 계산
- Gap Ranking 산출
- 웹 UI

### Sprint 2
- 결측/이상치 처리 고도화
- 재현성 로그 (원천값 + 산식)
- Vercel KV 캐싱
- 필터 UI (섹터, 시총)

### Sprint 3
- EPS 변동 감지 (전일 대비)
- 이벤트 트리거 구조
- 유료 데이터 추상화 계층

## ⚠️ 면책 조항

본 도구는 **리서치 참고용**이며, 투자 결정은 본인 책임입니다.
제공되는 데이터는 Financial Modeling Prep API를 통해 수집되며,
데이터의 정확성을 보장하지 않습니다.

## 📝 라이선스

MIT License
