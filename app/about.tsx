import Constants from 'expo-constants';
import { ScrollView, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/src/components/ui';
import { APP_NAME, APP_VERSION, VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { theme } from '@/src/theme';

export default function AboutScreen() {
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || '--';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <View style={{ width: 76, height: 76, borderRadius: 25, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 35, fontWeight: '900' }}>H</Text>
        </View>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 16 }}>{APP_NAME}</Text>
        <Text style={{ color: theme.subtext, marginTop: 6 }}>Version {APP_VERSION} ({buildNumber})</Text>
      </View>

      <SectionTitle title="产品定位" />
      <Card>
        <Text style={{ color: theme.text, lineHeight: 22 }}>Hub Vexlune 是 Vexlune Hub 的移动运营控制台，用于查看系统状态、管理用户与上游账号、查询请求日志并处理异常。</Text>
      </Card>

      <SectionTitle title="安全边界" />
      <Card>
        <Text style={{ color: theme.text, lineHeight: 22 }}>应用仅调用 Vexlune Hub 管理 API，不直连数据库、Redis、SSH 或生产主机。管理员凭据仅保存在系统 SecureStore，界面不会回显已保存的 Token。</Text>
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 14 }} />
        <Text selectable style={{ color: theme.subtext, fontSize: 12, lineHeight: 20 }}>{`Hub: ${VEXLUNE_HUB_URL}\nAPI: ${VEXLUNE_API_URL}`}</Text>
      </Card>

      <SectionTitle title="数据原则" />
      <Card>
        <Text style={{ color: theme.text, lineHeight: 22 }}>运营数据全部来自已验证的管理 API。财务、订单、套餐、优惠码、公告和操作日志均读取 Hub 的真实数据；创建优惠码和公告使用后端正式写入契约。模型分析保持只读，后端未提供的渠道绑定、模型启停和已结算上游成本不会用示例数据或猜测接口替代。</Text>
      </Card>

      <SectionTitle title="开源许可" />
      <Card>
        <Text style={{ color: theme.text, fontWeight: '800' }}>sub2api-mobile</Text>
        <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 19, marginTop: 8 }}>本项目基于 ckken/sub2api-mobile 改造，保留原项目 LICENSE 与必要归属。应用使用 Expo、React Native、TanStack Query、Valtio 等开源软件。</Text>
        <Text style={{ color: theme.faint, fontSize: 11, lineHeight: 17, marginTop: 12 }}>完整许可条款与第三方依赖归属见源代码仓库 LICENSE 及 package-lock.json。</Text>
      </Card>
    </ScrollView>
  );
}
