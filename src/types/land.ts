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
  /** 소유구분 원문 (예: "개인", "국유지"). 복수 레코드면 대표값 */
  ownershipLabel: string | null;
  /** 소유구분코드 원문 (예: "01") */
  ownershipCode: string | null;
  /** 복수 레코드에서 확인된 소유구분 명칭 목록 */
  ownershipLabels: string[];
  /** 소유구분 코드가 서로 다른 레코드가 섞여 있는지 */
  hasMixedOwnership: boolean;
  /** 누락/미분류 코드 또는 미수집 페이지가 있어 안전하게 단정할 수 없는지 */
  hasIncompleteOwnership: boolean;
  /** API가 보고한 전체 소유 레코드 수 */
  recordCount: number;
  /** 지목 (lndcgrCodeNm, 예: 임야, 대, 전, 답) */
  landCategory: string | null;
  /** 면적 (lndpclAr, ㎡) */
  areaSquareMeters: number | null;
  /** 데이터 갱신일 (lastUpdtDt) */
  lastUpdatedAt: string | null;
  /** 19자리 PNU 코드 */
  pnu: string | null;
  address: AddressInfo;
  /** 선택 지점에서 PNU/지적 정보를 찾지 못한 경우 */
  isNoCadastralInfo: boolean;
  /** API 키 미설정 등으로 실제 데이터가 아닌 안내용 임시 데이터인 경우 */
  isMock: boolean;
}

export type LandLookupErrorCode =
  | 'NETWORK'
  | 'NO_API_KEY'
  | 'NOT_FOUND'
  | 'API_KEY'
  | 'RATE_LIMIT'
  | 'PARAM'
  | 'SERVER'
  | 'UNKNOWN';

export interface LandLookupError {
  code: LandLookupErrorCode;
  message: string;
  /** 브이월드 원본 에러코드 (디버깅용) */
  rawCode?: string | null;
}

/** getPossessionAttr 응답의 possessions.field 원소 */
export interface PossessionField {
  posesnSeCode?: string;
  posesnSeCodeNm?: string;
  ldCodeNm?: string;
  mnnmSlno?: string;
  lndcgrCodeNm?: string;
  lndpclAr?: string | number;
  lastUpdtDt?: string;
  [key: string]: unknown;
}
