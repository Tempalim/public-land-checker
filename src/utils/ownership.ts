import { OwnershipType } from '../types/land';

/**
 * 소유구분코드(posesnSeCode) 코드표 — 출처: 국가중점데이터 컬럼정의서
 * 응답은 "01" 같은 2자리 문자열이고 정의서는 1자리이므로 앞의 0을 제거해 비교한다.
 *
 * 0: 일본인, 창씨명등   1: 개인        2: 국유지        3: 외국인, 외국공공기관
 * 4: 시, 도유지         5: 군유지      6: 법인          7: 종중
 * 8: 종교단체           9: 기타단체
 */
const OWNERSHIP_TYPE_BY_CODE: Record<number, OwnershipType> = {
  0: 'unknown', // 일본인, 창씨명등 — 소유 주체가 불분명하므로 확인 불가로 둔다
  1: 'private',
  2: 'national',
  3: 'private',
  4: 'public',
  5: 'public',
  6: 'private',
  7: 'private',
  8: 'private',
  9: 'private',
};

/** "01" → 1 처럼 앞의 0을 제거한 숫자로 정규화한다. 숫자가 아니면 null. */
export function normalizeOwnershipCode(code: string | number | null | undefined): number | null {
  if (code == null) return null;
  const raw = String(code).trim();
  if (!/^\d+$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
}

/**
 * 소유구분코드로 국유/공유/사유를 판별한다.
 * 코드표에 없는 값은 추측하지 않고 'unknown'(확인 불가)으로 처리한다.
 * 화면 표시는 posesnSeCodeNm(원문)을 그대로 쓰므로, 코드표에 없는 값도 사용자에게는 그대로 보인다.
 */
export function classifyOwnership(code: string | number | null | undefined): OwnershipType {
  const normalized = normalizeOwnershipCode(code);
  if (normalized == null) return 'unknown';
  return OWNERSHIP_TYPE_BY_CODE[normalized] ?? 'unknown';
}

export function ownershipDisplayName(type: OwnershipType): string {
  switch (type) {
    case 'national':
      return '국유지';
    case 'public':
      return '공유지';
    case 'private':
      return '사유지';
    case 'unknown':
    default:
      return '확인 불가';
  }
}

/** 국유지/공유지처럼 원칙적으로 신고 대상이 될 수 있는 소유구분인지 여부 */
export function isReportable(type: OwnershipType): boolean {
  return type === 'national' || type === 'public';
}
