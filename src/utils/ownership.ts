import { OwnershipType } from '../types/land';

/**
 * 브이월드/국토교통부 토지소유정보 응답의 "소유구분"(posesnSeCodeNm 등) 문자열을
 * 국유/공유/사유로 분류한다.
 *
 * 코드값(posesnSeCode)만으로 판별하지 않고 한글 라벨 키워드로 판별하는 이유:
 * 실제 API 응답 스키마는 0단계(개발 순서 9장 참고)에서 실제 인증키로 호출해
 * 직접 확인해야 하며, 코드 표는 기관/버전에 따라 달라질 수 있어 신뢰도가 낮다.
 * 라벨 문자열은 그대로 사람이 읽는 값이라 오분류 위험이 적다.
 * 실제 응답을 확인한 후 이 키워드 목록을 보정할 것.
 */
export function classifyOwnership(ownershipLabel: string | null | undefined): OwnershipType {
  if (!ownershipLabel) return 'unknown';

  const label = ownershipLabel.trim();

  if (label.includes('국유')) return 'national';

  const publicKeywords = ['시유', '도유', '군유', '구유', '읍유', '면유', '리유', '공유', '시,도유'];
  if (publicKeywords.some((keyword) => label.includes(keyword))) return 'public';

  const privateKeywords = ['개인', '사유', '법인', '종중', '외국인'];
  if (privateKeywords.some((keyword) => label.includes(keyword))) return 'private';

  return 'unknown';
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
