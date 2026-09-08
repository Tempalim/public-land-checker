# public-land-checker

국유지/사유지 여부를 확인하고 불법 점유 신고를 연결하는 모바일 앱 (Expo / React Native / TypeScript)

현재 위치(또는 지도에서 선택한 지점)가 국유지·공유지·사유지인지 브이월드(V-World) 오픈API로 조회하고,
국공유지에서 불법 점유(자릿세 요구 등)가 의심되면 안전신문고 신고로 바로 연결해 주는 여름철 계곡·하천
피서객용 MVP 앱입니다.

## 0. 시작하기 전에 꼭 확인할 것 — API 응답 확인

**코드를 보기 전에 이 단계부터 하세요.** 브이월드 "토지소유정보속성조회" API는 실제 발급받은 키로
직접 호출해서 응답 필드명/값을 확인하지 않으면 나중에 파싱 로직을 전부 갈아엎어야 할 수 있습니다.

```bash
VWORLD_API_KEY=발급받은키 node scripts/test-land-api.mjs 126.978 37.5665
```

이 스크립트는 (1) 지오코더(좌표→주소), (2) 연속지적도 필지 속성(PNU 포함) 을 순서대로 호출해
원본 JSON 응답을 그대로 출력합니다. 소유구분 관련 필드명이 이 저장소가 가정한 것과 다르면
`src/api/landOwnership.ts` 상단의 `LAND_OWNERSHIP_LAYER` 상수와 파싱 부분만 고치면 됩니다.

> **왜 미리 확정하지 않았는가**: 이 리포지토리는 브이월드(vworld.kr) 문서 사이트에 대한 아웃바운드
> 네트워크 접근이 차단된 환경에서 작성되었습니다. 그래서 "토지소유정보속성조회"의 정확한 데이터
> 레이어명은 확정하지 못했고, 대신 국토교통부 토지소유정보 데이터셋(같은 원천 데이터)에서 널리
> 쓰이는 필드명 `posesnSeCode` / `posesnSeCodeNm`(소유구분코드/명), `nationInsttSeCode` /
> `nationInsttSeCodeNm`(국가기관구분코드/명)을 기준으로 파싱 로직을 작성해 두었습니다. 실제 응답을
> 확인한 뒤 `scripts/test-land-api.mjs`의 3단계와 `src/api/landOwnership.ts`를 보정하세요.

## 1. 준비물

- Node.js (LTS)
- 폰에 [Expo Go](https://expo.dev/go) 앱 설치
- 브이월드(vworld.kr) 인증키 (마이포털에서 발급, WMS/WFS · 2D 지도 · 지오코더 · 2D 모바일 API 체크)

## 2. 실행 방법

```bash
npm install
cp .env.example .env   # VWORLD_API_KEY=발급받은키 입력
npm run start
```

터미널에 뜬 QR코드를 Expo Go 앱으로 스캔해 실행합니다. `.env`를 채우지 않아도 앱은 실행되며,
이 경우 지도/조회 결과가 "임시(목) 데이터"로 표시된다는 배너가 뜹니다 (실제 데이터 아님을 항상
명시함).

> 브이월드 인증키는 발급 시 등록한 서비스 URL/앱 스킴에서만 동작할 수 있습니다. 로컬 개발 중
> 인증 오류가 나면 브이월드 마이포털에서 등록된 URL을 확인하세요.

## 3. 프로젝트 구조

```
App.tsx                      앱 진입점 (MapScreen 렌더)
app.config.js                Expo 설정 + .env → Constants.expoConfig.extra 로 API 키 주입
scripts/test-land-api.mjs    0단계: 실제 키로 API 응답을 직접 확인하는 스크립트
src/
  api/
    config.ts                VWORLD_API_KEY 읽기 헬퍼
    geocoder.ts               좌표 → 주소 (브이월드 지오코더 API 2.0)
    landOwnership.ts          좌표 → 필지(PNU) → 소유구분 조회
  constants/
    colors.ts                 국유/공유(초록) · 사유(주황) · 확인불가(회색) 색상 규칙
    links.ts                  안전신문고 딥링크/웹/스토어 링크, 면책 문구
  hooks/
    useCurrentLocation.ts     위치 권한 요청 + GPS 좌표/정확도
  components/
    MapWebView.tsx            브이월드 2D 지도 API (WebView) — 지도 탭으로 지점 선택
    ResultCard.tsx             결과 바텀시트 카드 (화면 2)
    ReportGuideModal.tsx       신고 안내 모달 + 안전신문고 연결 (화면 3)
    Disclaimer.tsx             면책 문구
  screens/
    MapScreen.tsx              메인 화면 — 위치 권한/예외 처리 포함 전체 흐름 조립
  types/land.ts                공용 타입 (OwnershipType, LandOwnershipResult 등)
  utils/ownership.ts           소유구분 라벨 문자열 → national/public/private 분류
```

## 4. 핵심 데이터 흐름

```
GPS 좌표 또는 지도 탭 좌표
  → src/api/geocoder.ts        (표시용 지번/도로명 주소)
  → src/api/landOwnership.ts   연속지적도 레이어로 PNU 조회 → PNU로 소유구분 속성 조회
  → src/utils/ownership.ts     소유구분 라벨(예: "시,도유지")을 national/public/private로 분류
  → ResultCard                 결과 카드 표시, 국/공유지면 신고 버튼 노출
  → ReportGuideModal           체크리스트 안내 후 안전신문고 앱/스토어/웹 연결
```

## 5. 예외 처리 구현 현황

| 상황 | 구현 위치 |
|---|---|
| 하천구역이라 지번이 없음 | `landOwnership.ts`의 `isNoCadastralInfo` → `ResultCard`의 안내 문구 |
| API 조회 실패 | `ResultCard`의 오류 카드 + "다시 시도" 버튼 |
| 위치 권한 거부 | `MapScreen`의 권한 안내 화면 + 설정 열기 버튼 |
| GPS 정확도 낮음 (>50m) | `MapScreen` 상단 배너 + 지도에서 직접 선택 유도 |
| API 키 미설정 | `landOwnership.ts`가 목(mock) 데이터 반환, UI에 항상 배지로 표시 |

## 6. 면책 문구 및 출처 표시

앱 결과 카드 하단에 다음 문구가 항상 노출됩니다 (`src/constants/links.ts`의 `DISCLAIMER_TEXT`):

> 본 정보는 브이월드에서 제공하는 토지소유정보를 기반으로 하며, 실제 현황과 다를 수 있습니다.
> 참고용으로만 활용해 주세요. 정확한 정보는 해당 지자체에 문의하시기 바랍니다.

브이월드 이용약관상 출처 표시가 필요할 수 있으므로, 앱 정보 화면을 추가할 때
`VWORLD_ATTRIBUTION` 문구를 함께 노출하세요.

## 7. 개발 순서 진행 상황

- [x] 0단계 — API 응답 확인용 스크립트 작성 (`scripts/test-land-api.mjs`, **실제 키로 실행은 사용자가 직접 확인 필요**)
- [x] 1단계 — Expo 프로젝트 생성 (TypeScript)
- [x] 2단계 — 위치 권한 + GPS 좌표 획득 (`useCurrentLocation`)
- [x] 3단계 — 지오코더 연동 (`api/geocoder.ts`)
- [x] 4단계 — 토지소유정보 API 연동 (`api/landOwnership.ts`, 소유정보 레이어명은 0단계 확인 후 확정 필요)
- [x] 5단계 — 지도 화면 (`MapWebView`, 현재 위치 중심 + 탭으로 지점 선택)
- [x] 6단계 — 결과 카드 UI (`ResultCard`, 바텀시트)
- [x] 7단계 — 안전신문고 연결 (`ReportGuideModal`)
- [x] 8단계 — 예외 처리 + 면책 문구
- [ ] 9단계 — 디자인 다듬기 (실기기 테스트 후 진행 권장)

**중요**: 각 API 연동 단계는 실제 인증키로 실기기(Expo Go)에서 직접 확인이 필요합니다. 이 저장소가
만들어진 환경은 vworld.kr에 대한 네트워크 접근과 실물 기기 테스트가 불가능했으므로, 위 체크는
"코드 작성 완료" 기준이며 "실제 동작 확인 완료"가 아닙니다. 0단계 스크립트부터 실행해 확인하세요.

## 8. 환경변수

```
# .env
VWORLD_API_KEY=
```

`.env`는 `.gitignore`에 등록되어 있어 커밋되지 않습니다. `app.config.js`가 `dotenv`로 이 값을 읽어
`extra.vworldApiKey`로 노출하고, 앱에서는 `expo-constants`로 읽습니다 (`src/api/config.ts`).
