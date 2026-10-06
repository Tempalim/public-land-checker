import Constants from 'expo-constants';

export function getVworldApiKey(): string {
  const key = Constants.expoConfig?.extra?.vworldApiKey;
  return typeof key === 'string' ? key : '';
}

export function hasVworldApiKey(): boolean {
  return getVworldApiKey().length > 0;
}

export const VWORLD_GEOCODER_URL = 'https://api.vworld.kr/req/address';
export const VWORLD_DATA_URL = 'https://api.vworld.kr/req/data';
/** 토지소유정보속성조회 (0단계 확인 완료: /req/data 방식이 아니라 /ned/data 엔드포인트) */
export const VWORLD_POSSESSION_ATTR_URL = 'https://api.vworld.kr/ned/data/getPossessionAttr';
