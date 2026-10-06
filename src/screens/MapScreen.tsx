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
import { Coordinate, LandLookupError, LandOwnershipResult } from '../types/land';

const LOW_ACCURACY_THRESHOLD_METERS = 50;
const DEFAULT_CENTER: Coordinate = { latitude: 37.5665, longitude: 126.978 };

export function MapScreen() {
  const { status, coordinate, accuracy, errorMessage: locationError, requestLocation } =
    useCurrentLocation();

  const [selected, setSelected] = useState<Coordinate | null>(null);
  const [result, setResult] = useState<LandOwnershipResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<LandLookupError | null>(null);
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
      setLookupError(response.error);
    }
  }, []);

  const handleCheckHere = () => {
    const target = selected ?? coordinate;
    if (!target || loading) return;
    runLookup(target);
  };

  const handleMapTap = (coord: Coordinate) => {
    setSelected(coord);
    setSheetVisible(false);
    setLookupError(null);
  };

  const center = selected ?? coordinate ?? DEFAULT_CENTER;
  const marker = selected ?? coordinate;
  const isLowAccuracy = accuracy != null && accuracy > LOW_ACCURACY_THRESHOLD_METERS;
  const canCheck = selected != null || coordinate != null;

  const checkButtonLabel =
    status === 'requesting' && !canCheck
      ? '현재 위치 확인 중…'
      : canCheck
        ? '여기 확인하기'
        : '지도를 탭해 위치를 선택하세요';

  return (
    <SafeAreaView style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <MapWebView apiKey={getVworldApiKey()} center={center} marker={marker} onMapTap={handleMapTap} />
      </View>

      <View style={styles.noticeStack} pointerEvents="box-none">
        {!hasVworldApiKey() && (
          <View style={styles.topBanner}>
            <Text style={styles.topBannerText}>
              VWORLD_API_KEY가 없어 조회 결과는 임시 데이터입니다.
            </Text>
          </View>
        )}

        {status === 'denied' && (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionBannerTitle}>위치 권한이 꺼져 있습니다</Text>
            <Text style={styles.permissionBannerText}>
              지도에서 원하는 지점을 직접 선택할 수 있습니다. 현재 위치를 쓰려면 권한을 허용해 주세요.
            </Text>
            <View style={styles.permissionActions}>
              <TouchableOpacity style={styles.bannerButton} onPress={requestLocation}>
                <Text style={styles.bannerButtonText}>다시 요청</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bannerButton} onPress={() => Linking.openSettings()}>
                <Text style={styles.bannerButtonText}>설정 열기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLowAccuracy && !selected && status === 'granted' && (
          <View style={styles.topBanner}>
            <Text style={styles.topBannerText}>
              GPS 정확도가 낮습니다 (±{Math.round(accuracy!)}m). 지도를 탭해 직접 지점을 선택해 주세요.
            </Text>
          </View>
        )}

        {locationError && status === 'error' && (
          <View style={styles.topBanner}>
            <Text style={styles.topBannerText}>
              현재 위치를 가져오지 못했습니다. 지도를 탭해 직접 선택해 주세요.
            </Text>
          </View>
        )}
      </View>

      {!sheetVisible && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canCheck || loading}
          style={[styles.checkButton, (!canCheck || loading) && styles.checkButtonDisabled]}
          onPress={handleCheckHere}
        >
          <Text style={styles.checkButtonText}>{checkButtonLabel}</Text>
        </TouchableOpacity>
      )}

      {sheetVisible && (
        <View style={styles.sheetWrapper}>
          <ResultCard
            loading={loading}
            error={lookupError}
            result={result}
            onRetry={() => {
              const target = selected ?? coordinate;
              if (target) runLookup(target);
            }}
            onReportPress={() => setReportModalVisible(true)}
          />
          <TouchableOpacity style={styles.dismissSheet} onPress={() => setSheetVisible(false)}>
            <Text style={styles.dismissSheetText}>지도로 돌아가기</Text>
          </TouchableOpacity>
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
  noticeStack: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    gap: 8,
  },
  topBanner: {
    backgroundColor: 'rgba(31,41,55,0.92)',
    borderRadius: 10,
    padding: 10,
  },
  topBannerText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  permissionBanner: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  permissionBannerTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  permissionBannerText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 17,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  bannerButton: {
    backgroundColor: colors.unknownBg,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bannerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
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
  checkButtonDisabled: {
    backgroundColor: colors.unknown,
    shadowOpacity: 0,
    elevation: 0,
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
