import { AddressInfo, Coordinate, LandLookupError } from '../types/land';
import { getVworldApiKey, hasVworldApiKey, VWORLD_GEOCODER_URL } from './config';

// 브이월드 지오코더(좌표 -> 주소) API 2.0
// 참고: 4장/9장 3단계 - 먼저 이 API로 테스트해서 요구사항이 충족되는지 확인할 것.
// 응답 스키마가 문서와 다르면 parseGeocoderResponse만 수정하면 되도록 분리했다.
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
    type: 'both',
    zipcode: 'false',
    simple: 'false',
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
  const results: any[] = json?.response?.result ?? [];

  const parcel = results.find((r) => r?.type === 'parcel');
  const road = results.find((r) => r?.type === 'road');

  return {
    jibunAddress: parcel?.text ?? null,
    roadAddress: road?.text ?? null,
  };
}
