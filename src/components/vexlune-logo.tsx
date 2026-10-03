import { Image, View } from 'react-native';

/** The single product mark used by every authentication and lock surface. */
export function VexluneLogo({ size = 72 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        accessibilityLabel="Vexlune V logo"
        source={require('../../assets/vexlune-logo-light.png')}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}
