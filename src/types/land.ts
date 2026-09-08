export type OwnershipType = 'national' | 'public' | 'private' | 'unknown';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface AddressInfo {
  /** 지번 주소 (예: 경기도 ○○시 ○○동 산12) */
  jibunAddress: string | null;
  /** 도로명 주소 */
  roadAddress: string | null;
}

export interface LandOwnershipResult {
  ownershipType: OwnershipType;
  /** 소유구분 원문 (예: "시,도유지", "개인") */
  ownershipLabel: string | null;
  /** 국가기관구분 (예: "지자체", "중앙부처") */
  institutionLabel: string | null;
  /** 지목 (예: 임야, 대, 전, 답) */
  landCategory: string | null;
  /** 19자리 PNU 코드 */
  pnu: string | null;
  address: AddressInfo;
  /** 하천구역 등 지적 정보가 없는 특수 케이스 */
  isNoCadastralInfo: boolean;
  /** API 키 미설정 등으로 실제 데이터가 아닌 안내용 임시 데이터인 경우 */
  isMock: boolean;
}

export interface LandLookupError {
  code: 'NETWORK' | 'NO_API_KEY' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
}
