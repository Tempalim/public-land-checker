// 6장 화면 구성 - 색상 규칙
// 국유지/공유지 → 초록 계열, 사유지 → 주황/회색, 조회 불가 → 회색
export const colors = {
  national: '#1E8E3E',
  nationalBg: '#E6F4EA',
  public: '#1E8E3E',
  publicBg: '#E6F4EA',
  private: '#B45309',
  privateBg: '#FDF0E3',
  unknown: '#6B7280',
  unknownBg: '#F1F2F4',
  text: '#1F2937',
  subtext: '#6B7280',
  border: '#E5E7EB',
  background: '#FFFFFF',
  danger: '#D93025',
} as const;
