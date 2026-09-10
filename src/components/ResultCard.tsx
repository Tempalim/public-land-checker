import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isRetryable } from '../api/errors';
import { colors } from '../constants/colors';
import { LandLookupError, LandOwnershipResult } from '../types/land';
import { isReportable, ownershipDisplayName } from '../utils/ownership';
import { Disclaimer } from './Disclaimer';

interface ResultCardProps {
  loading: boolean;
  error: LandLookupError | null;
  result: LandOwnershipResult | null;
  onRetry: () => void;
  onReportPress: () => void;
}

const BADGE_BY_TYPE: Record<string, { emoji: string; label: string; fg: string; bg: string }> = {
  national: { emoji: '🟢', label: '국유지입니다', fg: colors.national, bg: colors.nationalBg },
  public: { emoji: '🟢', label: '공유지입니다', fg: colors.public, bg: colors.publicBg },
  private: { emoji: '🟠', label: '사유지입니다', fg: colors.private, bg: colors.privateBg },
  unknown: { emoji: '⚪️', label: '소유구분을 확인할 수 없습니다', fg: colors.unknown, bg: colors.unknownBg },
};

export function ResultCard({ loading, error, result, onRetry, onReportPress }: ResultCardProps) {
  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.national} />
        <Text style={styles.loadingText}>소유구분을 조회하고 있습니다…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorTitle}>
          {error.code === 'RATE_LIMIT' ? '조회 한도를 초과했습니다' : '조회에 실패했습니다'}
        </Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        {/* 설정 오류나 한도 초과는 다시 눌러도 결과가 같으므로 재시도 버튼을 숨긴다. */}
        {isRetryable(error.code) && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!result) {
    return null;
  }

  if (result.isNoCadastralInfo) {
    return (
      <View style={styles.card}>
        <Text style={styles.riverNotice}>
          하천구역으로 지적 정보가 없습니다. 하천은 원칙적으로 국유입니다.
        </Text>
        <ReportSection onPress={onReportPress} />
        <Disclaimer />
      </View>
    );
  }

  const badge = BADGE_BY_TYPE[result.ownershipType];

  return (
    <View style={styles.card}>
      <View style={[styles.badgeRow, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.fg }]}>
          {badge.emoji} {badge.label}
        </Text>
      </View>

      {result.isMock && (
        <Text style={styles.mockNotice}>
          ⚠️ VWORLD_API_KEY가 설정되지 않아 임시(목) 데이터로 표시 중입니다. 실제 조회 결과가 아닙니다.
        </Text>
      )}

      {result.hasMixedOwnership && (
        <Text style={styles.mixedNotice}>
          이 필지에는 소유구분이 다른 {result.recordCount}건의 기록이 있습니다 (
          {result.ownershipLabels.join(', ')}). 복수 소유일 수 있어 단정하기 어렵습니다.
        </Text>
      )}

      <InfoRow label="주소" value={result.address.jibunAddress ?? '확인 불가'} />
      <InfoRow label="지목" value={result.landCategory ?? '확인 불가'} />
      <InfoRow
        label="소유"
        value={
          result.hasMixedOwnership
            ? result.ownershipLabels.join(', ')
            : formatOwnership(result.ownershipType, result.ownershipLabel, result.ownershipCode)
        }
      />
      {result.areaSquareMeters != null && !Number.isNaN(result.areaSquareMeters) && (
        <InfoRow label="면적" value={`${result.areaSquareMeters.toLocaleString('ko-KR')}㎡`} />
      )}
      {result.lastUpdatedAt && <InfoRow label="갱신일" value={result.lastUpdatedAt} />}

      {isReportable(result.ownershipType) && <ReportSection onPress={onReportPress} />}

      <Disclaimer />
    </View>
  );
}

/**
 * 분류 결과와 원문을 함께 보여준다.
 * 코드표에 없는 값이면 판단을 감추지 않고 원본 코드/명칭을 함께 노출한다.
 * 예) "사유지 (개인)", "확인 불가 (코드 0, 일본인, 창씨명등)"
 */
function formatOwnership(
  type: LandOwnershipResult['ownershipType'],
  label: string | null,
  code: string | null,
): string {
  const display = ownershipDisplayName(type);

  if (type === 'unknown') {
    const detail = [code ? `코드 ${code}` : null, label].filter(Boolean).join(', ');
    return detail ? `${display} (${detail})` : display;
  }

  if (!label || label === display) return display;
  return `${display} (${label})`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ReportSection({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.reportSection}>
      <Text style={styles.reportNotice}>⚠️ 국공유지에서 자릿세를 요구받으셨나요?</Text>
      <TouchableOpacity style={styles.reportButton} onPress={onPress}>
        <Text style={styles.reportButtonText}>불법 점유 신고하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.subtext,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 4,
  },
  errorMessage: {
    color: colors.subtext,
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.unknownBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  riverNotice: {
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.nationalBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  badgeRow: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 17,
    fontWeight: '700',
  },
  mockNotice: {
    fontSize: 12,
    color: colors.private,
    marginBottom: 8,
  },
  mixedNotice: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
    backgroundColor: colors.unknownBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    width: 64,
    color: colors.subtext,
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  reportSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.unknownBg,
    borderRadius: 10,
  },
  reportNotice: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },
  reportButton: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
