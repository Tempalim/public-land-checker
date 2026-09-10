#!/usr/bin/env node
/**
 * 브이월드 API 응답 확인용 스크립트 (개발 순서 0단계).
 * 앱을 켜지 않고 좌표 하나로 전체 흐름(주소 → PNU → 소유구분)을 그대로 재현한다.
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

async function callJson(label, url) {
  console.log(`\n${label}`);
  console.log(url.replace(apiKey, '***'));
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTP ${response.status} ${response.statusText}`);
    console.error(await response.text());
    return null;
  }
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
  return json;
}

// 1) 좌표 → 지번주소
const geocoderUrl = `https://api.vworld.kr/req/address?${new URLSearchParams({
  service: 'address',
  request: 'getAddress',
  version: '2.0',
  crs: 'epsg:4326',
  point: `${longitude},${latitude}`,
  format: 'json',
  type: 'PARCEL',
  key: apiKey,
})}`;
await callJson('[1/3] 지오코더 (좌표 → 지번주소)', geocoderUrl);

// 2) 좌표 → PNU
const parcelUrl = `https://api.vworld.kr/req/data?${new URLSearchParams({
  service: 'data',
  request: 'GetFeature',
  data: 'LP_PA_CBND_BUBUN',
  key: apiKey,
  geomFilter: `POINT(${longitude} ${latitude})`,
  format: 'json',
  size: '10',
})}`;
const parcelJson = await callJson('[2/3] 연속지적도 (좌표 → PNU)', parcelUrl);
const pnu = parcelJson?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu ?? null;

// 3) PNU → 소유구분
if (!pnu) {
  console.log('\n[3/3] PNU를 얻지 못해 소유정보 조회를 건너뜁니다 (하천구역 등 지적 정보 없음).');
} else {
  const possessionUrl = `https://api.vworld.kr/ned/data/getPossessionAttr?${new URLSearchParams({
    pnu,
    format: 'json',
    numOfRows: '100',
    pageNo: '1',
    key: apiKey,
  })}`;
  const possessionJson = await callJson(`[3/3] 토지소유정보속성조회 (PNU: ${pnu})`, possessionUrl);

  const rawField = possessionJson?.possessions?.field;
  const fields = Array.isArray(rawField) ? rawField : rawField ? [rawField] : [];

  // 앱과 동일한 코드표 (국가중점데이터 컬럼정의서)
  const TYPE_BY_CODE = {
    0: '확인 불가', 1: '사유지', 2: '국유지', 3: '사유지', 4: '공유지',
    5: '공유지', 6: '사유지', 7: '사유지', 8: '사유지', 9: '사유지',
  };
  const codes = [
    ...new Set(fields.map((f) => Number.parseInt(String(f?.posesnSeCode ?? ''), 10)).filter((n) => !Number.isNaN(n))),
  ];

  console.log('\n--- 요약 ---');
  console.log(`totalCount: ${possessionJson?.possessions?.totalCount ?? '?'} (레코드 ${fields.length}건)`);
  for (const field of fields) {
    const code = Number.parseInt(String(field?.posesnSeCode ?? ''), 10);
    const classified = TYPE_BY_CODE[code] ?? '확인 불가';
    console.log(`  ${field?.posesnSeCode ?? '-'} (${field?.posesnSeCodeNm ?? '-'}) → ${classified}`);
  }
  if (codes.length > 1) console.log('  ← 소유구분이 서로 다름: 복수 소유로 안내됨');
  console.log(`지목: ${fields[0]?.lndcgrCodeNm ?? '-'} / 면적: ${fields[0]?.lndpclAr ?? '-'}㎡`);
}
