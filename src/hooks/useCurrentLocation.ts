import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Coordinate } from '../types/land';
import { createLatestRequest } from '../utils/latestRequest';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
const LOCATION_TIMEOUT_MS = 20_000;

export function useCurrentLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requests = useRef(createLatestRequest()).current;

  const requestLocation = useCallback(async () => {
    const request = requests.start();
    setStatus('requesting');
    setCoordinate(null);
    setAccuracy(null);
    setErrorMessage(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (!request.isCurrent()) return;
      if (permission !== 'granted') { setStatus('denied'); return; }
      // The native one-shot API has no cancellation handle. Ignore late native results.
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('현재 위치 확인 시간이 초과되었습니다. 지도를 직접 선택하거나 다시 시도해 주세요.')), LOCATION_TIMEOUT_MS);
        }),
      ]);
      if (!request.isCurrent()) return;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        throw new Error('유효한 위치를 받지 못했습니다. 지도를 직접 선택해 주세요.');
      }
      setCoordinate({ latitude, longitude });
      setAccuracy(position.coords.accuracy ?? null);
      setStatus('granted');
    } catch (error) {
      if (!request.isCurrent()) return;
      setErrorMessage(error instanceof Error ? error.message : '위치를 가져오지 못했습니다.');
      setStatus('error');
    } finally { if (timer) clearTimeout(timer); }
  }, [requests]);

  useEffect(() => {
    void requestLocation();
    return () => requests.cancel();
  }, [requestLocation, requests]);

  return { status, coordinate, accuracy, errorMessage, requestLocation };
}
