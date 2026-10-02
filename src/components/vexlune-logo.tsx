import { Image, View } from 'react-native';

/** The single product mark used by every authentication and lock surface. */
export function VexluneLogo({ size = 72 }: { size?: number }) {
  const radius = Math.round(size * 0.31);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: '#080810' }}>
      <Image
        accessibilityLabel="Vexlune V logo"
        source={require('../../assets/vexlune-icon.png')}
        resizeMode="cover"
        style={{ width: size, height: size }}
      />
    </View>
  );
}
