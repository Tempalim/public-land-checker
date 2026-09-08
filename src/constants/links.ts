import { Platform } from 'react-native';

// 안전신문고 앱 딥링크 / 웹 / 스토어 링크 (7장)
export const SAFETY_REPORT_APP_SCHEME = 'safetyreport://';
export const SAFETY_REPORT_WEB_URL = 'https://www.safetyreport.go.kr';
export const SAFETY_REPORT_STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/kr/app/id1090732531',
  android:
    'https://play.google.com/store/apps/details?id=kr.go.safetyreport.report',
  default: SAFETY_REPORT_WEB_URL,
})!;

export const VWORLD_ATTRIBUTION =
  '본 정보는 브이월드(V-World, 국토교통부 국토지리정보원)에서 제공하는 오픈API를 활용합니다.';

export const DISCLAIMER_TEXT =
  '본 정보는 브이월드에서 제공하는 토지소유정보를 기반으로 하며, 실제 현황과 다를 수 있습니다. 참고용으로만 활용해 주세요. 정확한 정보는 해당 지자체에 문의하시기 바랍니다.';
