import React, { useMemo } from 'react';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Coordinate } from '../types/land';

interface MapWebViewProps {
  apiKey: string;
  center: Coordinate;
  marker: Coordinate | null;
  onMapTap: (coordinate: Coordinate) => void;
}

interface MapTapPayload {
  type: 'tap';
  latitude: number;
  longitude: number;
}

function buildHtml(apiKey: string, center: Coordinate, marker: Coordinate | null) {
  const escapedApiKey = encodeURIComponent(apiKey);

  const markerScript = marker
    ? `
      try {
        var markerEl = document.createElement("div");
        markerEl.style.cssText = "font-size:30px; line-height:30px; transform: translate(-50%, -90%);";
        markerEl.innerText = "📍";
        var markerCoord = vw.ol3.proj.transform(
          [${marker.longitude}, ${marker.latitude}],
          "EPSG:4326",
          "EPSG:900913"
        );
        var markerOverlay = new vw.ol3.Overlay({
          element: markerEl,
          position: markerCoord,
          positioning: "bottom-center"
        });
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
  <script src="https://map.vworld.kr/js/webglMapInit.js.do?apiKey=${escapedApiKey}"></script>
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

function isMapTapPayload(payload: unknown): payload is MapTapPayload {
  if (typeof payload !== 'object' || payload === null) return false;

  const candidate = payload as {
    type?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  };

  return (
    candidate.type === 'tap' &&
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180
  );
}

export function MapWebView({ apiKey, center, marker, onMapTap }: MapWebViewProps) {
  const html = useMemo(
    () => buildHtml(apiKey, center, marker),
    [apiKey, center.latitude, center.longitude, marker?.latitude, marker?.longitude],
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload: unknown = JSON.parse(event.nativeEvent.data);
      if (isMapTapPayload(payload)) {
        onMapTap({ latitude: payload.latitude, longitude: payload.longitude });
      }
    } catch {
      // malformed WebView messages are ignored
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
