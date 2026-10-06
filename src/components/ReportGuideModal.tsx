import * as Linking from 'expo-linking';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { SAFETY_REPORT_STORE_URL, SAFETY_REPORT_WEB_URL } from '../constants/links';

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
  const openSafetyReportWeb = async () => {
    try {
      await Linking.openURL(SAFETY_REPORT_WEB_URL);
    } catch {
      await Linking.openURL(SAFETY_REPORT_STORE_URL);
    }
  };

  const openSafetyReportStore = async () => {
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

          <TouchableOpacity style={styles.primaryButton} onPress={openSafetyReportWeb}>
            <Text style={styles.primaryButtonText}>안전신문고 웹에서 신고하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.storeButton} onPress={openSafetyReportStore}>
            <Text style={styles.storeButtonText}>안전신문고 앱 설치하기</Text>
          </TouchableOpacity>

          <Text style={styles.storeNotice}>
            공식 안전신문고 홈페이지 연결을 기본 경로로 사용합니다.
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
  storeButton: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  storeButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
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
