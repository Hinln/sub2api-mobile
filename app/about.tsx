import { ScrollView, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/src/components/ui';
import { APP_NAME, APP_VERSION, VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { theme } from '@/src/theme';

export default function AboutScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 44 }}>
      <View style={{ alignItems: 'center', paddingVertical: 18 }}><View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900' }}>V</Text></View><Text style={{ color: theme.text, fontSize: 21, fontWeight: '900', marginTop: 16 }}>{APP_NAME}</Text><Text style={{ color: theme.subtext, marginTop: 6 }}>Version {APP_VERSION} (2)</Text></View>
      <SectionTitle title={'\u5b89\u5168\u8fb9\u754c'} />
      <Card><Text style={{ color: theme.text, lineHeight: 22 }}>{'\u672c\u5e94\u7528\u4ec5\u8c03\u7528 Vexlune Hub \u7ba1\u7406 API\uff0c\u4e0d\u76f4\u8fde\u6570\u636e\u5e93\u3001Redis\u3001SSH \u6216\u751f\u4ea7\u4e3b\u673a\u3002\u7ba1\u7406\u51ed\u636e\u4ec5\u4fdd\u5b58\u5728\u7cfb\u7edf SecureStore\u3002'}</Text><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 19, marginTop: 12 }}>{`Hub: ${VEXLUNE_HUB_URL}\nAPI: ${VEXLUNE_API_URL}`}</Text></Card>
      <SectionTitle title={'\u5f00\u6e90\u8bb8\u53ef'} />
      <Card><Text style={{ color: theme.text, fontWeight: '800' }}>sub2api-mobile</Text><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 19, marginTop: 8 }}>{'\u672c\u9879\u76ee\u57fa\u4e8e ckken/sub2api-mobile \u6539\u9020\uff0c\u4fdd\u7559\u539f\u9879\u76ee LICENSE \u4e0e\u5fc5\u8981\u5f52\u5c5e\u3002\u5e94\u7528\u4f7f\u7528 Expo\u3001React Native\u3001TanStack Query\u3001Valtio \u7b49\u5f00\u6e90\u8f6f\u4ef6\u3002'}</Text><Text style={{ color: theme.faint, fontSize: 11, lineHeight: 17, marginTop: 12 }}>{'\u5b8c\u6574\u8bb8\u53ef\u6761\u6b3e\u4e0e\u7b2c\u4e09\u65b9\u4f9d\u8d56\u5f52\u5c5e\u89c1\u6e90\u7801\u4ed3\u5e93 LICENSE \u53ca package-lock.json\u3002'}</Text></Card>
    </ScrollView>
  );
}
