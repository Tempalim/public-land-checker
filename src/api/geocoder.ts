import { AddressInfo, Coordinate, LandLookupError } from '../types/land';
import { getVworldApiKey, hasVworldApiKey, VWORLD_GEOCODER_URL } from './config';

// 브이월드 지오코더(좌표 -> 주소) API 2.0 — 0단계 확인 완료
// GET /req/address?service=address&request=getAddress&version=2.0
//     &crs=epsg:4326&point=경도,위도&format=json&type=PARCEL&key=키
export async function reverseGeocode(
  coordinate: Coordinate,
): Promise<{ ok: true; data: AddressInfo } | { ok: false; error: LandLookupError }> {
  if (!hasVworldApiKey()) {
    return {
      ok: false,
      error: { code: 'NO_API_KEY', message: 'VWORLD_API_KEY가 설정되어 있지 않습니다.' },
    };
  }

  const params = new URLSearchParams({
    service: 'address',
    request: 'getAddress',
    version: '2.0',
    crs: 'epsg:4326',
    point: `${coordinate.longitude},${coordinate.latitude}`,
    format: 'json',
    type: 'PARCEL',
    key: getVworldApiKey(),
  });

  try {
    const response = await fetch(`${VWORLD_GEOCODER_URL}?${params.toString()}`);
    if (!response.ok) {
      return {
        ok: false,
        error: { code: 'NETWORK', message: `지오코더 API 응답 오류 (HTTP ${response.status})` },
      };
    }
    const json = await response.json();
    return { ok: true, data: parseGeocoderResponse(json) };
  } catch (e) {
    return {
      ok: false,
      error: { code: 'NETWORK', message: e instanceof Error ? e.message : '알 수 없는 오류' },
    };
  }
}

function parseGeocoderResponse(json: any): AddressInfo {
  const rawResult = json?.response?.result;
  const results: any[] = Array.isArray(rawResult) ? rawResult : rawResult ? [rawResult] : [];

  const parcel = results.find((r) => String(r?.type).toLowerCase() === 'parcel') ?? results[0];
  const road = results.find((r) => String(r?.type).toLowerCase() === 'road');

  return {
    jibunAddress: parcel?.text ?? null,
    roadAddress: road?.text ?? null,
  };
}
