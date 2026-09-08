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
