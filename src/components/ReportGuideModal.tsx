import * as Linking from 'expo-linking';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { SAFETY_REPORT_APP_SCHEME, SAFETY_REPORT_STORE_URL, SAFETY_REPORT_WEB_URL } from '../constants/links';

interface ReportGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

const CHECKLIST = [
  '불법 시설물(파라솔, 평상 등)이 보이도록 사진을 촬영하세요.',
  '위치를 알 수 있도록 주변 풍경도 함께 촬영하세요.',
  '아래 버튼으로 안전신문고에 접속해 신고서를 작성하세요.',
];

export function ReportGuideModal({ visible, onClose }: ReportGuideModalProps) {
  const openSafetyReport = async () => {
    try {
      const canOpenApp = await Linking.canOpenURL(SAFETY_REPORT_APP_SCHEME);
      if (canOpenApp) {
        await Linking.openURL(SAFETY_REPORT_APP_SCHEME);
        return;
      }
    } catch {
      // 앱이 없거나 스킴을 열 수 없는 경우 아래로 진행
    }

    try {
      await Linking.openURL(SAFETY_REPORT_STORE_URL);
    } catch {
      await Linking.openURL(SAFETY_REPORT_WEB_URL);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>신고 전 확인해 주세요</Text>

          {CHECKLIST.map((item, index) => (
            <View key={item} style={styles.checklistItem}>
              <Text style={styles.checklistIndex}>{index + 1}</Text>
              <Text style={styles.checklistText}>{item}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.primaryButton} onPress={openSafetyReport}>
            <Text style={styles.primaryButtonText}>안전신문고 열기</Text>
          </TouchableOpacity>

          <Text style={styles.storeNotice}>
            앱이 설치되어 있지 않다면 스토어로 이동해 설치 후 신고할 수 있어요.
          </Text>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  checklistIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.nationalBg,
    color: colors.national,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 10,
    overflow: 'hidden',
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  storeNotice: {
    marginTop: 10,
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.subtext,
    fontWeight: '600',
  },
});
