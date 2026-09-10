import { OwnershipType } from '../types/land';

/**
 * getPossessionAttr 응답의 소유구분명(posesnSeCodeNm)을 국유/공유/사유로 분류한다.
 *
 * 0단계 확인 결과: posesnSeCode는 "01" 같은 코드 문자열이지만 코드-의미 매핑표는
 * 확인되지 않았다. 따라서 코드가 아니라 한글 라벨(posesnSeCodeNm)로 판별한다.
 * 알 수 없는 값은 임의로 추측하지 않고 'unknown'(확인 불가)으로 처리한다.
 */
export function classifyOwnership(ownershipLabel: string | null | undefined): OwnershipType {
  if (!ownershipLabel) return 'unknown';

  const label = ownershipLabel.replace(/\s/g, '');

  if (label.includes('국유')) return 'national';
  if (label.includes('공유')) return 'public';

  // "시,도유지" / "군유지" 처럼 '공유'라는 단어 없이 지자체 소유를 나타내는 표기도 공유지로 본다.
  const localGovernmentKeywords = ['시유', '도유', '군유', '구유', '읍유', '면유', '리유'];
  if (localGovernmentKeywords.some((keyword) => label.includes(keyword))) return 'public';

  if (label.includes('개인') || label.includes('법인') || label.includes('사유')) return 'private';

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
