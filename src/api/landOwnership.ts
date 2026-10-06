import {
  AddressInfo,
  LandLookupError,
  LandOwnershipResult,
  PossessionField,
} from '../types/land';
import { classifyOwnership, normalizeOwnershipCode } from '../utils/ownership';
import { toVworldApiError, VworldApiError } from './errors';
import { fetchJson } from './request';
import { reverseGeocode } from './geocoder';
import {
  getVworldApiKey,
  hasVworldApiKey,
  VWORLD_DATA_URL,
  VWORLD_POSSESSION_ATTR_URL,
} from './config';

const CADASTRAL_PARCEL_LAYER = 'LP_PA_CBND_BUBUN';
const POSSESSION_PAGE_SIZE = 100;
const MAX_POSSESSION_PAGES = 20;

interface PossessionPage {
  fields: PossessionField[];
  totalCount: number;
}

async function getPnuByPoint(longitude: number, latitude: number, signal?: AbortSignal): Promise<string | null> {
  const query = new URLSearchParams({
    service: 'data',
    request: 'GetFeature',
    data: CADASTRAL_PARCEL_LAYER,
    key: getVworldApiKey(),
    geomFilter: `POINT(${longitude} ${latitude})`,
    format: 'json',
    size: '10',
  });

  const json: any = await fetchJson(`${VWORLD_DATA_URL}?${query.toString()}`, signal);

  if (json?.response?.status === 'ERROR' || json?.response?.error) {
    throw toVworldApiError(json?.response?.error?.code, json?.response?.error?.text);
  }

  const pnu = json?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu;
  return typeof pnu === 'string' && pnu.length > 0 ? pnu : null;
}

async function getPossessionPage(pnu: string, pageNo: number, signal?: AbortSignal): Promise<PossessionPage> {
  const query = new URLSearchParams({
    pnu,
    format: 'json',
    numOfRows: String(POSSESSION_PAGE_SIZE),
    pageNo: String(pageNo),
    key: getVworldApiKey(),
  });

  const json: any = await fetchJson(`${VWORLD_POSSESSION_ATTR_URL}?${query.toString()}`, signal);
  const possessions = json?.possessions;

  const resultCode: string | undefined = possessions?.resultCode ?? json?.resultCode;
  if (resultCode && resultCode !== '00') {
    throw toVworldApiError(resultCode, possessions?.resultMsg ?? json?.resultMsg);
  }
  if (json?.error?.code) {
    throw toVworldApiError(json.error.code, json.error.text ?? json.error.message);
  }

  const rawField = possessions?.field;
  const fields: PossessionField[] = Array.isArray(rawField)
    ? rawField
    : rawField
      ? [rawField]
      : [];

  const totalCount = Number(possessions?.totalCount ?? fields.length) || fields.length;
  return { fields, totalCount };
}

async function getPossessionAttr(
  pnu: string,
  signal?: AbortSignal,
): Promise<{ fields: PossessionField[]; totalCount: number; isTruncated: boolean }> {
  const firstPage = await getPossessionPage(pnu, 1, signal);
  const fields = [...firstPage.fields];
  const totalCount = firstPage.totalCount;

  let pageNo = 2;
  while (
    fields.length < totalCount &&
    pageNo <= MAX_POSSESSION_PAGES
  ) {
    const page = await getPossessionPage(pnu, pageNo, signal);
    if (page.fields.length === 0) break;
    fields.push(...page.fields);
    pageNo += 1;
  }

  return {
    fields,
    totalCount,
    isTruncated: fields.length < totalCount,
  };
}

function firstNonEmpty(fields: PossessionField[], key: keyof PossessionField): string | null {
  for (const field of fields) {
    const value = field?.[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

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
    hasIncompleteOwnership: false,
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

function isValidCoordinate(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export async function lookupLandOwnership(
  longitude: number,
  latitude: number,
  signal?: AbortSignal,
): Promise<{ ok: true; data: LandOwnershipResult } | { ok: false; error: LandLookupError }> {
  if (!isValidCoordinate(longitude, latitude)) {
    return {
      ok: false,
      error: {
        code: 'PARAM',
        message: '위치 좌표가 올바르지 않습니다. 지도를 다시 선택해 주세요.',
      },
    };
  }

  if (!hasVworldApiKey()) {
    return { ok: true, data: emptyResult({ isMock: true }) };
  }

  try {
    const [pnu, geocoded] = await Promise.all([
      getPnuByPoint(longitude, latitude, signal),
      reverseGeocode({ latitude, longitude }, signal),
    ]);

    const geocodedAddress: AddressInfo = geocoded.ok
      ? geocoded.data
      : { jibunAddress: null, roadAddress: null };

    if (!pnu) {
      return {
        ok: true,
        data: emptyResult({ address: geocodedAddress, isNoCadastralInfo: true }),
      };
    }

    const { fields, totalCount, isTruncated } = await getPossessionAttr(pnu, signal);

    if (fields.length === 0) {
      return {
        ok: true,
        data: emptyResult({
          pnu,
          address: geocodedAddress,
          recordCount: totalCount,
        }),
      };
    }

    const normalizedCodes = fields.map((field) => normalizeOwnershipCode(field.posesnSeCode));
    const ownershipCodes = Array.from(
      new Set(normalizedCodes.filter((code): code is number => code != null)),
    );
    const ownershipLabels = Array.from(
      new Set(
        fields
          .map((field) => field.posesnSeCodeNm)
          .filter((label): label is string => typeof label === 'string' && label.trim().length > 0)
          .map((label) => label.trim()),
      ),
    );

    const hasMissingOwnershipCode = normalizedCodes.some((code) => code == null);
    const hasUnclassifiableOwnershipCode = ownershipCodes.some(
      (code) => classifyOwnership(code) === 'unknown',
    );
    const hasIncompleteOwnership =
      isTruncated || hasMissingOwnershipCode || hasUnclassifiableOwnershipCode;

    const hasMixedOwnership =
      ownershipCodes.length > 1 ||
      (ownershipCodes.length === 0 && ownershipLabels.length > 1);

    const representativeCode = firstNonEmpty(fields, 'posesnSeCode');
    const representativeLabel = ownershipLabels[0] ?? null;
    const canClassify =
      !hasMixedOwnership &&
      !hasIncompleteOwnership &&
      ownershipCodes.length === 1;

    const area = firstNonEmpty(fields, 'lndpclAr');

    return {
      ok: true,
      data: {
        ownershipType: canClassify ? classifyOwnership(ownershipCodes[0]) : 'unknown',
        ownershipLabel: representativeLabel,
        ownershipCode: representativeCode,
        ownershipLabels,
        hasMixedOwnership,
        hasIncompleteOwnership,
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
        rawCode: null,
      },
    };
  }
}
