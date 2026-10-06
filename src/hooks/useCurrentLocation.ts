import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Coordinate } from '../types/land';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

interface UseCurrentLocationResult {
  status: LocationStatus;
  coordinate: Coordinate | null;
  accuracy: number | null;
  errorMessage: string | null;
  requestLocation: () => Promise<void>;
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage(null);
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordinate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setAccuracy(position.coords.accuracy ?? null);
      setStatus('granted');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : '위치를 가져오지 못했습니다.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { status, coordinate, accuracy, errorMessage, requestLocation };
}
