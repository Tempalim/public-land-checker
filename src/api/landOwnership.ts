import {
  AddressInfo,
  LandLookupError,
  LandOwnershipResult,
  PossessionField,
} from '../types/land';
import { classifyOwnership, normalizeOwnershipCode } from '../utils/ownership';
import { toVworldApiError, VworldApiError } from './errors';
import { reverseGeocode } from './geocoder';
import {
  getVworldApiKey,
  hasVworldApiKey,
  VWORLD_DATA_URL,
  VWORLD_POSSESSION_ATTR_URL,
} from './config';

// 0단계 확인 완료된 사양
// 1) 좌표 → PNU : /req/data GetFeature (연속지적도 LP_PA_CBND_BUBUN)
// 2) PNU → 소유구분 : /ned/data/getPossessionAttr
const CADASTRAL_PARCEL_LAYER = 'LP_PA_CBND_BUBUN';
const POSSESSION_PAGE_SIZE = 100;

/** 좌표가 속한 필지의 PNU를 조회한다. */
async function getPnuByPoint(longitude: number, latitude: number): Promise<string | null> {
  const query = new URLSearchParams({
    service: 'data',
    request: 'GetFeature',
    data: CADASTRAL_PARCEL_LAYER,
    key: getVworldApiKey(),
    geomFilter: `POINT(${longitude} ${latitude})`,
    format: 'json',
    size: '10',
  });

  const response = await fetch(`${VWORLD_DATA_URL}?${query.toString()}`);
  if (!response.ok) {
    throw new VworldApiError('NETWORK', `필지 조회 실패 (HTTP ${response.status})`, null);
  }

  const json = await response.json();

  // /req/data 오류 응답: { response: { status: "ERROR", error: { code, text } } }
  if (json?.response?.status === 'ERROR' || json?.response?.error) {
    throw toVworldApiError(json?.response?.error?.code, json?.response?.error?.text);
  }

  const pnu = json?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu;
  return typeof pnu === 'string' && pnu.length > 0 ? pnu : null;
}

/**
 * PNU로 토지소유정보 속성을 조회한다.
 * 응답: { possessions: { field: [...], pageNo, totalCount, numOfRows, resultCode, resultMsg } }
 * 건물 층별 등으로 레코드가 여러 건일 수 있어 목록 전체를 돌려준다.
 */
async function getPossessionAttr(
  pnu: string,
): Promise<{ fields: PossessionField[]; totalCount: number }> {
  const query = new URLSearchParams({
    pnu,
    format: 'json',
    numOfRows: String(POSSESSION_PAGE_SIZE),
    pageNo: '1',
    key: getVworldApiKey(),
  });

  const response = await fetch(`${VWORLD_POSSESSION_ATTR_URL}?${query.toString()}`);
  if (!response.ok) {
    throw new VworldApiError('NETWORK', `토지소유정보 조회 실패 (HTTP ${response.status})`, null);
  }

  const json = await response.json();
  const possessions = json?.possessions;

  // 에러코드는 possessions 안에 오기도 하고 최상위로 오기도 한다.
  // 정상 응답의 resultCode는 "00"이고, 오류는 INVALID_KEY 같은 문자열 코드로 온다.
  const resultCode: string | undefined = possessions?.resultCode ?? json?.resultCode;
  if (resultCode && resultCode !== '00') {
    throw toVworldApiError(resultCode, possessions?.resultMsg ?? json?.resultMsg);
  }
  if (json?.error?.code) {
    throw toVworldApiError(json.error.code, json.error.text ?? json.error.message);
  }

  // field는 단건일 때 배열이 아닐 수 있어 방어적으로 배열화한다.
  const rawField = possessions?.field;
  const fields: PossessionField[] = Array.isArray(rawField)
    ? rawField
    : rawField
      ? [rawField]
      : [];

  const totalCount = Number(possessions?.totalCount ?? fields.length) || fields.length;
  return { fields, totalCount };
}

function firstNonEmpty(fields: PossessionField[], key: keyof PossessionField): string | null {
  for (const field of fields) {
    const value = field?.[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

/** ldCodeNm(법정동명) + mnnmSlno(지번)으로 지번주소를 구성한다. */
function buildJibunAddress(fields: PossessionField[]): string | null {
  const dong = firstNonEmpty(fields, 'ldCodeNm');
  const jibun = firstNonEmpty(fields, 'mnnmSlno');
  if (!dong && !jibun) return null;
  return [dong, jibun].filter(Boolean).join(' ');
}

function emptyResult(overrides: Partial<LandOwnershipResult>): LandOwnershipResult {
  return {
    ownershipType: 'unknown',
    ownershipLabel: null,
    ownershipCode: null,
    ownershipLabels: [],
    hasMixedOwnership: false,
    recordCount: 0,
    landCategory: null,
    areaSquareMeters: null,
    lastUpdatedAt: null,
    pnu: null,
    address: { jibunAddress: null, roadAddress: null },
    isNoCadastralInfo: false,
    isMock: false,
    ...overrides,
  };
}

export async function lookupLandOwnership(
  longitude: number,
  latitude: number,
): Promise<{ ok: true; data: LandOwnershipResult } | { ok: false; error: LandLookupError }> {
  if (!hasVworldApiKey()) {
    // 키 미설정 시에도 UI를 확인할 수 있도록 목(mock) 데이터를 반환한다.
    // 실제 데이터가 아님은 isMock 플래그로 UI에 항상 드러난다.
    return { ok: true, data: emptyResult({ isMock: true }) };
  }

  try {
    // 주소는 소유정보와 독립적으로 얻을 수 있으므로 병렬로 호출한다.
    const [pnu, geocoded] = await Promise.all([
      getPnuByPoint(longitude, latitude),
      reverseGeocode({ latitude, longitude }),
    ]);

    const geocodedAddress: AddressInfo = geocoded.ok
      ? geocoded.data
      : { jibunAddress: null, roadAddress: null };

    if (!pnu) {
      // 하천구역 등 지적 정보가 없는 지점
      return {
        ok: true,
        data: emptyResult({ address: geocodedAddress, isNoCadastralInfo: true }),
      };
    }

    const { fields, totalCount } = await getPossessionAttr(pnu);

    if (fields.length === 0) {
      return { ok: true, data: emptyResult({ pnu, address: geocodedAddress }) };
    }

    // 복수 레코드(건물 층별 등)에서 소유구분이 모두 같으면 하나로, 다르면 복수 소유로 안내한다.
    // 판별 기준은 코드(posesnSeCode)이고, 라벨(posesnSeCodeNm)은 화면 표시용이다.
    const ownershipCodes = Array.from(
      new Set(
        fields
          .map((field) => normalizeOwnershipCode(field.posesnSeCode))
          .filter((code): code is number => code != null),
      ),
    );
    const ownershipLabels = Array.from(
      new Set(
        fields
          .map((field) => field.posesnSeCodeNm)
          .filter((label): label is string => typeof label === 'string' && label.trim().length > 0)
          .map((label) => label.trim()),
      ),
    );
    // 코드가 하나도 없으면 라벨 종류 수로 대신 판단한다.
    const hasMixedOwnership =
      ownershipCodes.length > 1 || (ownershipCodes.length === 0 && ownershipLabels.length > 1);
    const representativeCode = firstNonEmpty(fields, 'posesnSeCode');
    const representativeLabel = ownershipLabels[0] ?? null;

    const area = firstNonEmpty(fields, 'lndpclAr');

    return {
      ok: true,
      data: {
        // 소유구분이 섞여 있으면 한쪽으로 단정하지 않고 '확인 불가'로 두고 목록을 함께 보여준다.
        ownershipType: hasMixedOwnership ? 'unknown' : classifyOwnership(representativeCode),
        ownershipLabel: representativeLabel,
        ownershipCode: representativeCode,
        ownershipLabels,
        hasMixedOwnership,
        recordCount: totalCount,
        landCategory: firstNonEmpty(fields, 'lndcgrCodeNm'),
        areaSquareMeters: area != null && area !== '' ? Number(area) : null,
        lastUpdatedAt: firstNonEmpty(fields, 'lastUpdtDt'),
        pnu,
        address: {
          jibunAddress: geocodedAddress.jibunAddress ?? buildJibunAddress(fields),
          roadAddress: geocodedAddress.roadAddress,
        },
        isNoCadastralInfo: false,
        isMock: false,
      },
    };
  } catch (e) {
    if (e instanceof VworldApiError) {
      return { ok: false, error: { code: e.code, message: e.message, rawCode: e.rawCode } };
    }
    return {
      ok: false,
      error: {
        code: 'NETWORK',
        message: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
        rawCode: e instanceof Error ? e.message : null,
      },
    };
  }
}
