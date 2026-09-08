import { LandLookupError, LandOwnershipResult } from '../types/land';
import { classifyOwnership } from '../utils/ownership';
import { getVworldApiKey, hasVworldApiKey, VWORLD_DATA_URL } from './config';

/**
 * ⚠️ 0단계 확인 필요 (README "API 응답 확인" 절 참고)
 *
 * 브이월드 "토지소유정보속성조회" API의 정확한 데이터 레이어명은 이 세션에서
 * 실제 인증키로 호출해 확인하지 못했다 (네트워크 정책상 vworld.kr 문서 접근 불가).
 * 아래 두 상수만 브이월드 마이포털 > 오픈API > API 레퍼런스 > "토지소유정보"에서
 * 확인한 값으로 교체하면 이 파일의 나머지 로직(파싱, 분류)은 그대로 동작한다.
 *
 * 연속지적도(필지 경계+PNU)는 공개 레이어 LP_PA_CBND_BUBUN 사용이 널리 알려져 있어
 * 그대로 두었고, 소유정보 레이어명만 TODO로 남겨둔다.
 */
const CADASTRAL_PARCEL_LAYER = 'LP_PA_CBND_BUBUN';
const LAND_OWNERSHIP_LAYER = 'TODO_CONFIRM_LAYER_NAME'; // TODO(0단계)

async function requestFeature(data: string, params: Record<string, string>) {
  const query = new URLSearchParams({
    service: 'data',
    request: 'GetFeature',
    format: 'json',
    crs: 'EPSG:4326',
    data,
    key: getVworldApiKey(),
    ...params,
  });
  const response = await fetch(`${VWORLD_DATA_URL}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`VWorld Data API 오류 (HTTP ${response.status})`);
  }
  return response.json();
}

/** 좌표가 속한 필지의 PNU/지목 등 지적 속성을 조회한다. */
async function getParcelByPoint(longitude: number, latitude: number) {
  const json = await requestFeature(CADASTRAL_PARCEL_LAYER, {
    geomFilter: `POINT(${longitude} ${latitude})`,
    size: '1',
  });
  const feature = json?.response?.result?.featureCollection?.features?.[0];
  return feature?.properties ?? null;
}

/** PNU로 소유구분 속성을 조회한다. */
async function getOwnershipByPnu(pnu: string) {
  const json = await requestFeature(LAND_OWNERSHIP_LAYER, {
    attrFilter: `pnu:=:${pnu}`,
    size: '1',
  });
  const feature = json?.response?.result?.featureCollection?.features?.[0];
  return feature?.properties ?? null;
}

function buildMockResult(): LandOwnershipResult {
  return {
    ownershipType: 'unknown',
    ownershipLabel: null,
    institutionLabel: null,
    landCategory: null,
    pnu: null,
    address: { jibunAddress: null, roadAddress: null },
    isNoCadastralInfo: false,
    isMock: true,
  };
}

export async function lookupLandOwnership(
  longitude: number,
  latitude: number,
): Promise<{ ok: true; data: LandOwnershipResult } | { ok: false; error: LandLookupError }> {
  if (!hasVworldApiKey()) {
    // 키 미설정 시에도 UI(2~7단계)를 개발/확인할 수 있도록 목(mock) 데이터를 반환한다.
    // 실제 소유구분 데이터가 아님이 isMock 플래그와 UI 배지로 항상 드러난다.
    return { ok: true, data: buildMockResult() };
  }

  try {
    const parcel = await getParcelByPoint(longitude, latitude);

    if (!parcel) {
      return {
        ok: true,
        data: {
          ownershipType: 'unknown',
          ownershipLabel: null,
          institutionLabel: null,
          landCategory: null,
          pnu: null,
          address: { jibunAddress: null, roadAddress: null },
          isNoCadastralInfo: true,
          isMock: false,
        },
      };
    }

    const pnu: string | null = parcel.pnu ?? null;
    const landCategory: string | null = parcel.jimok ?? parcel.jibunAddr ?? null;

    let ownershipLabel: string | null = null;
    let institutionLabel: string | null = null;

    if (pnu) {
      try {
        const ownership = await getOwnershipByPnu(pnu);
        ownershipLabel = ownership?.posesnSeCodeNm ?? ownership?.소유구분 ?? null;
        institutionLabel = ownership?.nationInsttSeCodeNm ?? ownership?.국가기관구분 ?? null;
      } catch {
        // 소유정보 레이어명이 아직 TODO 상태이거나 일시 오류인 경우, 필지 정보까지는 보여준다.
      }
    }

    return {
      ok: true,
      data: {
        ownershipType: classifyOwnership(ownershipLabel),
        ownershipLabel,
        institutionLabel,
        landCategory,
        pnu,
        address: {
          jibunAddress: parcel.jibunAddr ?? parcel.addr ?? null,
          roadAddress: null,
        },
        isNoCadastralInfo: false,
        isMock: false,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: { code: 'NETWORK', message: e instanceof Error ? e.message : '알 수 없는 오류' },
    };
  }
}
