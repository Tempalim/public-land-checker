import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { DISCLAIMER_TEXT, VWORLD_ATTRIBUTION } from '../constants/links';

export function Disclaimer() {
  return (
    <View style={styles.container}>
      <Text style={styles.attribution}>{VWORLD_ATTRIBUTION}</Text>
      <Text style={styles.text}>{DISCLAIMER_TEXT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  attribution: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.subtext,
    fontWeight: '600',
    marginBottom: 3,
  },
  text: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtext,
  },
});
