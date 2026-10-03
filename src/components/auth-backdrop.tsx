import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * The auth surface follows the supplied Vexlune reference: a calm white and
 * blue field with soft orbital light and flowing waves. It is drawn locally so
 * the screen remains usable when the network is unavailable.
 */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const waveY = safeHeight * 0.78;

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={safeWidth} height={safeHeight} viewBox={`0 0 ${safeWidth} ${safeHeight}`}>
          <Defs>
            <SvgLinearGradient id="authSky" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F8FBFF" />
              <Stop offset="0.52" stopColor="#EEF7FF" />
              <Stop offset="1" stopColor="#F9F8FF" />
            </SvgLinearGradient>
            <SvgLinearGradient id="authWave" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#D8EAFE" stopOpacity="0.76" />
              <Stop offset="0.48" stopColor="#E8E1FF" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#C8EDFF" stopOpacity="0.76" />
            </SvgLinearGradient>
            <SvgLinearGradient id="authOrbit" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#DCCAFF" stopOpacity="0.42" />
              <Stop offset="1" stopColor="#A9E5FF" stopOpacity="0.18" />
            </SvgLinearGradient>
          </Defs>
          <Rect width={safeWidth} height={safeHeight} fill="url(#authSky)" />
          <Ellipse cx={safeWidth * 0.61} cy={safeHeight * 0.27} rx={safeWidth * 0.47} ry={safeHeight * 0.28} fill="url(#authOrbit)" opacity={0.58} />
          <Circle cx={safeWidth * 0.13} cy={safeHeight * 0.31} r={safeWidth * 0.15} fill="#CDEAFF" opacity={0.28} />
          <Path d={`M0 ${waveY + safeHeight * 0.01} C${safeWidth * 0.16} ${waveY - safeHeight * 0.09}, ${safeWidth * 0.29} ${waveY + safeHeight * 0.12}, ${safeWidth * 0.46} ${waveY + safeHeight * 0.02} S${safeWidth * 0.79} ${waveY - safeHeight * 0.08}, ${safeWidth} ${waveY + safeHeight * 0.04} L${safeWidth} ${safeHeight} L0 ${safeHeight} Z`} fill="url(#authWave)" opacity={0.62} />
          <Path d={`M0 ${waveY + safeHeight * 0.09} C${safeWidth * 0.22} ${waveY - safeHeight * 0.02}, ${safeWidth * 0.34} ${waveY + safeHeight * 0.18}, ${safeWidth * 0.57} ${waveY + safeHeight * 0.06} S${safeWidth * 0.82} ${waveY - safeHeight * 0.02}, ${safeWidth} ${waveY + safeHeight * 0.11}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.72} strokeWidth={Math.max(1, safeWidth * 0.006)} />
          <Path d={`M0 ${waveY + safeHeight * 0.17} C${safeWidth * 0.19} ${waveY + safeHeight * 0.04}, ${safeWidth * 0.4} ${waveY + safeHeight * 0.24}, ${safeWidth * 0.63} ${waveY + safeHeight * 0.12} S${safeWidth * 0.84} ${waveY + safeHeight * 0.04}, ${safeWidth} ${waveY + safeHeight * 0.17}`} fill="none" stroke="#D9E7FF" strokeOpacity={0.8} strokeWidth={Math.max(1, safeWidth * 0.004)} />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8FF' },
});
