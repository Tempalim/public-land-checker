require('dotenv/config');

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'public-land-checker',
    slug: 'public-land-checker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'publiclandchecker',
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          '현재 위치가 국유지인지 사유지인지 확인하기 위해 위치 정보가 필요합니다.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            '현재 위치가 국유지인지 사유지인지 확인하기 위해 위치 정보가 필요합니다.',
        },
      ],
    ],
    extra: {
      // .env 파일의 VWORLD_API_KEY 값을 런타임에서 Constants.expoConfig.extra.vworldApiKey 로 읽는다.
      // 절대 이 값을 코드에 직접 하드코딩하지 말 것 (README 10장 참고).
      vworldApiKey: process.env.VWORLD_API_KEY ?? '',
    },
  },
};
