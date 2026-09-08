import React, { useCallback, useState } from 'react';
import {
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getVworldApiKey, hasVworldApiKey } from '../api/config';
import { lookupLandOwnership } from '../api/landOwnership';
import { MapWebView } from '../components/MapWebView';
import { ReportGuideModal } from '../components/ReportGuideModal';
import { ResultCard } from '../components/ResultCard';
import { colors } from '../constants/colors';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { Coordinate, LandOwnershipResult } from '../types/land';

const LOW_ACCURACY_THRESHOLD_METERS = 50;
const DEFAULT_CENTER: Coordinate = { latitude: 37.5665, longitude: 126.978 }; // 서울시청 (위치 권한 거부 시 기본값)

export function MapScreen() {
  const { status, coordinate, accuracy, errorMessage: locationError, requestLocation } =
    useCurrentLocation();

  const [selected, setSelected] = useState<Coordinate | null>(null);
  const [result, setResult] = useState<LandOwnershipResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const runLookup = useCallback(async (target: Coordinate) => {
    setLoading(true);
    setLookupError(null);
    setSheetVisible(true);

    const response = await lookupLandOwnership(target.longitude, target.latitude);
    setLoading(false);

    if (response.ok) {
      setResult(response.data);
    } else {
      setResult(null);
      setLookupError(response.error.message);
    }
  }, []);

  const handleCheckHere = () => {
    const target = selected ?? coordinate;
    if (!target) return;
    runLookup(target);
  };

  const handleMapTap = (coord: Coordinate) => {
    setSelected(coord);
    setSheetVisible(false);
  };

  if (status === 'denied') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permissionTitle}>위치 권한이 필요합니다</Text>
        <Text style={styles.permissionBody}>
          현재 위치의 소유구분을 확인하려면 위치 접근 권한을 허용해 주세요. 설정에서 권한을
          허용한 뒤 다시 시도해 주세요.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestLocation}>
          <Text style={styles.primaryButtonText}>다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.secondaryButtonText}>설정 열기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const center = selected ?? coordinate ?? DEFAULT_CENTER;
  const isLowAccuracy = accuracy != null && accuracy > LOW_ACCURACY_THRESHOLD_METERS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <MapWebView apiKey={getVworldApiKey()} center={center} marker={selected} onMapTap={handleMapTap} />
      </View>

      {!hasVworldApiKey() && (
        <View style={styles.topBanner}>
          <Text style={styles.topBannerText}>
            VWORLD_API_KEY가 없어 지도/조회가 임시 데이터로 표시됩니다.
          </Text>
        </View>
      )}

      {isLowAccuracy && !selected && (
        <View style={styles.topBanner}>
          <Text style={styles.topBannerText}>
            GPS 정확도가 낮습니다 (±{Math.round(accuracy!)}m). 지도를 탭해 직접 지점을 선택해 주세요.
          </Text>
        </View>
      )}

      {!sheetVisible && (
        <TouchableOpacity style={styles.checkButton} onPress={handleCheckHere}>
          <Text style={styles.checkButtonText}>여기 확인하기</Text>
        </TouchableOpacity>
      )}

      {sheetVisible && (
        <View style={styles.sheetWrapper}>
          <ResultCard
            loading={loading}
            errorMessage={lookupError}
            result={result}
            onRetry={() => runLookup(selected ?? coordinate ?? DEFAULT_CENTER)}
            onReportPress={() => setReportModalVisible(true)}
          />
          <TouchableOpacity style={styles.dismissSheet} onPress={() => setSheetVisible(false)}>
            <Text style={styles.dismissSheetText}>지도로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {locationError && (
        <View style={styles.topBanner}>
          <Text style={styles.topBannerText}>{locationError}</Text>
        </View>
      )}

      <ReportGuideModal visible={reportModalVisible} onClose={() => setReportModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  permissionBody: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.national,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.subtext,
    fontWeight: '600',
  },
  topBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(31,41,55,0.9)',
    borderRadius: 10,
    padding: 10,
  },
  topBannerText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  checkButton: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: colors.national,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dismissSheet: {
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dismissSheetText: {
    color: colors.subtext,
    fontWeight: '600',
    fontSize: 12,
  },
});
