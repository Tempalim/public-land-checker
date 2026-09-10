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
  /** 소유구분코드 원문 (예: "01"). 코드 매핑 미확인이라 표시/디버깅용으로만 보관 */
  ownershipCode: string | null;
  /** 복수 레코드에서 서로 다른 소유구분이 섞여 있을 때의 전체 목록 */
  ownershipLabels: string[];
  /** 소유구분이 서로 다른 레코드가 섞여 있는지 (복수 소유 안내용) */
  hasMixedOwnership: boolean;
  /** 조회된 소유 레코드 수 (totalCount) */
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
  /** 하천구역 등 지적 정보가 없는 특수 케이스 */
  isNoCadastralInfo: boolean;
  /** API 키 미설정 등으로 실제 데이터가 아닌 안내용 임시 데이터인 경우 */
  isMock: boolean;
}

export interface LandLookupError {
  code: 'NETWORK' | 'NO_API_KEY' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
}

/** getPossessionAttr 응답의 possessions.field 원소 (0단계에서 확인된 필드만) */
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
