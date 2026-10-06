# public-land-checker

국유지/사유지 여부를 확인하고 불법 점유 신고를 연결하는 모바일 앱 (Expo / React Native / TypeScript)

현재 위치(또는 지도에서 선택한 지점)가 국유지·공유지·사유지인지 브이월드(V-World) 오픈API로 조회하고,
국공유지에서 불법 점유(자릿세 요구 등)가 의심되면 안전신문고 신고로 바로 연결해 주는 여름철 계곡·하천
피서객용 MVP 앱입니다.

## 0. 사용하는 브이월드 API (0단계 확인 완료)

좌표 하나로 세 번의 호출이 일어납니다. `scripts/test-land-api.mjs`가 이 흐름을 그대로 재현하므로,
앱을 켜기 전에 먼저 이걸로 응답을 확인할 수 있습니다.

```bash
VWORLD_API_KEY=발급받은키 node scripts/test-land-api.mjs 126.978 37.5665
```

| 목적 | 요청 |
|---|---|
| 좌표 → 지번주소 | `GET /req/address?service=address&request=getAddress&version=2.0&crs=epsg:4326&point=경도,위도&format=json&type=PARCEL&key=키` |
| 좌표 → PNU(19자리) | `GET /req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&geomFilter=POINT(경도 위도)&format=json&size=10&key=키` → `response.result.featureCollection.features[0].properties.pnu` |
| PNU → 소유구분 | `GET /ned/data/getPossessionAttr?pnu=…&format=json&numOfRows=…&pageNo=1&key=키` |

소유정보 응답 구조:

```json
{ "possessions": { "field": [ { "posesnSeCode": "01", "posesnSeCodeNm": "개인", "ldCodeNm": "…",
  "mnnmSlno": "…", "lndcgrCodeNm": "…", "lndpclAr": "…", "lastUpdtDt": "…" } ],
  "pageNo": 1, "totalCount": 1, "numOfRows": 100, "resultCode": "00", "resultMsg": "…" } }
```

**소유구분 판별** (`src/utils/ownership.ts`): `posesnSeCode` 코드값으로 판별합니다. 응답은 `"01"`
같은 2자리, 코드정의서(국가중점데이터 컬럼정의서)는 1자리라서 앞의 0을 제거해 비교합니다.

| 코드 | 소유구분 | 앱 분류 |
|---|---|---|
| 0 | 일본인, 창씨명등 | 확인 불가 |
| 1 | 개인 | 사유지 |
| 2 | 국유지 | **국유지** |
| 3 | 외국인, 외국공공기관 | 사유지 |
| 4 | 시, 도유지 | **공유지** |
| 5 | 군유지 | **공유지** |
| 6 | 법인 | 사유지 |
| 7 | 종중 | 사유지 |
| 8 | 종교단체 | 사유지 |
| 9 | 기타단체 | 사유지 |

`posesnSeCodeNm`은 화면 표시용으로만 씁니다. 코드표에 없는 값이 오면 **확인 불가**로 처리하고,
원본 코드와 명칭을 함께 노출합니다 (예: `확인 불가 (코드 12, ○○○)`). 신고 버튼은 국유지·공유지일
때만 노출됩니다.

**복수 레코드**: `totalCount`가 1보다 클 수 있습니다. 앱은 100건 단위로 추가 페이지를 조회하며,
서로 다른 소유구분 코드가 섞여 있으면 하나로 단정하지 않습니다. 코드 누락·미분류 값이 있거나
안전 한도 내에서 전체 페이지를 수집하지 못한 경우에도 결과를 **확인 불가**로 처리하고 신고 버튼을
노출하지 않습니다.

**에러코드 처리** (`src/api/errors.ts`):

| 브이월드 에러코드 | 사용자 안내 | 재시도 버튼 |
|---|---|---|
| `OVER_REQUEST_LIMIT` | 오늘 조회 한도를 초과했습니다. 내일 다시 시도해주세요. | 숨김 |
| `INVALID_KEY`, `INCORRECT_KEY`, `UNAVAILABLE_KEY`, `URL_TYPE` | 서비스 설정 오류입니다. (원인 괄호 표기) | 숨김 |
| `PARAM_REQUIRED`, `INVALID_TYPE`, `INVALID_RANGE` | 조회 요청 정보가 올바르지 않습니다. | 노출 |
| `SYSTEM_ERROR`, `UNKNOWN_ERROR` | 브이월드 서버에 일시적인 문제가 있습니다. | 노출 |
| 그 외 / 네트워크 실패 | 조회 중 오류가 발생했습니다 · 네트워크 연결을 확인해 주세요. | 노출 |

## 1. 준비물

- Node.js (LTS)
- 폰에 [Expo Go](https://expo.dev/go) 앱 설치
- 브이월드(vworld.kr) 인증키 (마이포털에서 발급, WMS/WFS · 2D 지도 · 지오코더 · 2D 모바일 API 체크)

## 2. 실행 방법

```bash
npm install
cp .env.example .env   # VWORLD_API_KEY=발급받은키 입력
npm run typecheck  # TypeScript 정적 검사
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
    config.ts                VWORLD_API_KEY 읽기 헬퍼, 엔드포인트 상수
    errors.ts                 브이월드 에러코드 → 사용자 안내 문구 매핑
    geocoder.ts               좌표 → 주소 (브이월드 지오코더 API 2.0)
    landOwnership.ts          좌표 → 필지(PNU) → 소유구분 조회
  constants/
    colors.ts                 국유/공유(초록) · 사유(주황) · 확인불가(회색) 색상 규칙
    links.ts                  안전신문고 공식 웹/스토어 링크, 면책 문구
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
  → geocoder.ts + landOwnership.ts   지번주소 조회와 PNU 조회를 병렬 호출
  → landOwnership.ts                 PNU → getPossessionAttr 로 소유구분/지목/면적 조회
  → utils/ownership.ts               posesnSeCode 코드값을 national/public/private로 분류
  → ResultCard                       결과 카드 표시, 국/공유지면 신고 버튼 노출
  → ReportGuideModal                 체크리스트 안내 후 안전신문고 공식 웹/스토어 연결
```

## 5. 예외 처리 구현 현황

| 상황 | 구현 위치 |
|---|---|
| PNU/지적 정보가 없음 | `isNoCadastralInfo` → 소유구분을 단정하지 않고 안내, 신고 버튼 숨김 |
| 한 필지에 소유구분이 다른 복수 레코드 | `hasMixedOwnership` → 소유구분을 단정하지 않음 |
| 코드 누락·미분류·일부 페이지 미수집 | `hasIncompleteOwnership` → 보수적으로 "확인 불가" 처리 |
| 코드표에 없는 소유구분코드 | `classifyOwnership`이 'unknown' 반환 → 신고 버튼 숨김 |
| API 조회 실패 | `errors.ts`가 에러코드별 안내 문구로 변환 → `ResultCard` 오류 카드 (한도 초과·설정 오류는 재시도 버튼 숨김) |
| 위치 권한 거부 | 앱을 막지 않고 지도 수동 선택 유지 + 권한 안내/설정 버튼 제공 |
| GPS 정확도 낮음 (>50m) | `MapScreen` 상단 배너 + 지도에서 직접 선택 유도 |
| API 키 미설정 | `landOwnership.ts`가 목(mock) 데이터 반환, UI에 항상 배지로 표시 |

## 6. 면책 문구 및 출처 표시

앱 결과 카드 하단에 다음 문구가 항상 노출됩니다 (`src/constants/links.ts`의 `DISCLAIMER_TEXT`):

> 본 정보는 브이월드에서 제공하는 토지소유정보를 기반으로 하며, 실제 현황과 다를 수 있습니다.
> 참고용으로만 활용해 주세요. 정확한 정보는 해당 지자체에 문의하시기 바랍니다.

`Disclaimer`에서 `VWORLD_ATTRIBUTION` 문구도 함께 표시합니다.

## 7. 개발 순서 진행 상황

- [x] 0단계 — API 응답 확인 완료 (엔드포인트/응답 구조/소유구분 필드 확정, 위 0장 참고)
- [x] 1단계 — Expo 프로젝트 생성 (TypeScript)
- [x] 2단계 — 위치 권한 + GPS 좌표 획득 (`useCurrentLocation`)
- [x] 3단계 — 지오코더 연동 (`api/geocoder.ts`)
- [x] 4단계 — 토지소유정보 API 연동 (`api/landOwnership.ts`, `getPossessionAttr`)
- [x] 5단계 — 지도 화면 (`MapWebView`, 현재 위치 중심 + 탭으로 지점 선택)
- [x] 6단계 — 결과 카드 UI (`ResultCard`, 바텀시트)
- [x] 7단계 — 안전신문고 연결 (`ReportGuideModal`)
- [x] 8단계 — 예외 처리 + 면책 문구
- [ ] 9단계 — 디자인 다듬기 (실기기 테스트 후 진행 권장)
- [x] MVP 하드닝 1차 — 위치 권한 fallback, PNU 미확인 시 오판 방지, 출처 표기, 지도 좌표 검증, CI 타입체크
- [x] API 하드닝 2차 — 좌표 범위 검증, 소유정보 페이지네이션, 누락/미분류 레코드 보수 처리
- [x] UX 하드닝 3차 — 지도 로딩/오류 표시, 내 위치 복귀, 긴 결과 스크롤, 안전신문고 공식 웹 우선 연결

**중요**: API 사양은 0단계에서 확인되었지만, 코드가 실기기에서 동작하는지는 아직 확인되지
않았습니다 (이 저장소가 만들어진 환경에서는 vworld.kr 호출과 실물 기기 테스트가 불가능).
`npm run test-land-api`로 응답을 먼저 확인한 뒤 Expo Go로 각 화면을 눌러보세요. 지도 마커
표시(`vw.ol3.Overlay`)는 실기기에서 추가 검증이 필요합니다. 안전신문고 연결은 공식 웹 URL을
기본 경로로 사용하고 앱 설치 버튼은 스토어 URL로 연결합니다.

## 8. 환경변수

```
# .env
VWORLD_API_KEY=
```

`.env`는 `.gitignore`에 등록되어 있어 커밋되지 않습니다. `app.config.js`가 `dotenv`로 이 값을 읽어
`extra.vworldApiKey`로 노출하고, 앱에서는 `expo-constants`로 읽습니다 (`src/api/config.ts`).
