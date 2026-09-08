import React, { useMemo } from 'react';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Coordinate } from '../types/land';

interface MapWebViewProps {
  apiKey: string;
  center: Coordinate;
  marker: Coordinate | null;
  onMapTap: (coordinate: Coordinate) => void;
}

function buildHtml(apiKey: string, center: Coordinate, marker: Coordinate | null) {
  const markerScript = marker
    ? `
      // 참고: vw.ol3.Overlay는 브이월드 2D 지도 API 샘플 예제의 마커 표시 방식을 따른 것으로,
      // API 버전에 따라 클래스 경로가 다를 수 있다. 마커가 보이지 않으면 브이월드
      // "2D 지도 API" 레퍼런스의 마커/오버레이 예제를 확인해 이 부분만 교체하면 된다.
      try {
        var markerEl = document.createElement("div");
        markerEl.style.cssText = "font-size:30px; line-height:30px; transform: translate(-50%, -90%);";
        markerEl.innerText = "📍";
        var markerCoord = vw.ol3.proj.transform(
          [${marker.longitude}, ${marker.latitude}],
          "EPSG:4326",
          "EPSG:900913"
        );
        var markerOverlay = new vw.ol3.Overlay({ element: markerEl, position: markerCoord, positioning: "bottom-center" });
        map.olMap.addOverlay(markerOverlay);
      } catch (markerErr) {
        post({ type: "error", message: "marker: " + String(markerErr) });
      }
    `
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #vmap { margin: 0; padding: 0; width: 100%; height: 100%; }
  </style>
  <script src="https://map.vworld.kr/js/webglMapInit.js.do?apiKey=${apiKey}"></script>
</head>
<body>
  <div id="vmap"></div>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    var map;
    try {
      var mapOptions = {
        mapId: "vmap",
        initPosition: new vw.ol3.CameraPosition(
          new vw.ol3.Coordinate(${center.longitude}, ${center.latitude}),
          17
        ),
        logo: false,
        navigation: true
      };
      map = new vw.ol3.Map("vmap", mapOptions);

      map.olMap.on("click", function (evt) {
        var coord = vw.ol3.proj.transform(evt.coordinate, "EPSG:900913", "EPSG:4326");
        post({ type: "tap", longitude: coord[0], latitude: coord[1] });
      });

      ${markerScript}

      post({ type: "ready" });
    } catch (err) {
      post({ type: "error", message: String(err) });
    }
  </script>
</body>
</html>`;
}

export function MapWebView({ apiKey, center, marker, onMapTap }: MapWebViewProps) {
  const html = useMemo(
    () => buildHtml(apiKey, center, marker),
    [apiKey, center.latitude, center.longitude, marker?.latitude, marker?.longitude],
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'tap') {
        onMapTap({ latitude: payload.latitude, longitude: payload.longitude });
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      style={{ flex: 1 }}
    />
  );
}
