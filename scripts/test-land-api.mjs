#!/usr/bin/env node
/**
 * 9장 0단계 — API 응답 확인용 스크립트.
 * 코드를 앱에 붙이기 전에 이 스크립트로 브이월드 API 응답을 직접 확인한다.
 *
 * 사용법:
 *   VWORLD_API_KEY=발급받은키 node scripts/test-land-api.mjs 126.978 37.5665
 *   (인자 순서: 경도 위도. 기본값은 서울시청)
 */

const apiKey = process.env.VWORLD_API_KEY;
if (!apiKey) {
  console.error('환경변수 VWORLD_API_KEY가 필요합니다. 예) VWORLD_API_KEY=xxxx node scripts/test-land-api.mjs');
  process.exit(1);
}

const [, , lngArg, latArg] = process.argv;
const longitude = lngArg ?? '126.978';
const latitude = latArg ?? '37.5665';

async function callGeocoder() {
  const params = new URLSearchParams({
    service: 'address',
    request: 'getAddress',
    version: '2.0',
    crs: 'epsg:4326',
    point: `${longitude},${latitude}`,
    format: 'json',
    type: 'both',
    key: apiKey,
  });
  const url = `https://api.vworld.kr/req/address?${params.toString()}`;
  console.log('\n[1/3] 지오코더 API 호출');
  console.log(url.replace(apiKey, '***'));
  const json = await fetch(url).then((r) => r.json());
  console.log(JSON.stringify(json, null, 2));
  return json;
}

async function callParcel() {
  const params = new URLSearchParams({
    service: 'data',
    request: 'GetFeature',
    format: 'json',
    crs: 'EPSG:4326',
    data: 'LP_PA_CBND_BUBUN',
    geomFilter: `POINT(${longitude} ${latitude})`,
    size: '1',
    key: apiKey,
  });
  const url = `https://api.vworld.kr/req/data?${params.toString()}`;
  console.log('\n[2/3] 연속지적도(필지) 속성 조회 API 호출');
  console.log(url.replace(apiKey, '***'));
  const json = await fetch(url).then((r) => r.json());
  console.log(JSON.stringify(json, null, 2));
  return json;
}

async function callOwnership(pnu) {
  if (!pnu) {
    console.log('\n[3/3] PNU를 얻지 못해 소유정보 조회를 건너뜁니다.');
    return;
  }
  console.log('\n[3/3] 토지소유정보속성조회 — 브이월드 오픈API > API 레퍼런스 > "토지소유정보"에서');
  console.log('실제 요청 URL/파라미터를 확인한 뒤 아래 자리에 채워서 다시 호출해 보세요.');
  console.log(`확인한 PNU: ${pnu}`);
}

const geocoderJson = await callGeocoder();
const parcelJson = await callParcel();
const pnu = parcelJson?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu ?? null;
await callOwnership(pnu);

console.log(
  '\n확인 결과에 맞춰 src/api/geocoder.ts, src/api/landOwnership.ts의 필드 매핑을 조정하세요.',
);
