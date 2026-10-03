import { Check, ChevronRight, FileText, ShieldCheck, X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import type { LoginAgreementDocument } from '@/src/types/auth';
import { theme } from '@/src/theme';

function inlineText(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <Text key={`${index}-${part}`} style={{ fontWeight: '800', color: theme.text }}>{part.slice(2, -2)}</Text>
    : part);
}

function markdownContent(value: string) {
  return value.split(/\r?\n/).map((line, index) => {
    const text = line.trim();
    if (!text) return <View key={`spacer-${index}`} style={{ height: 8 }} />;
    if (/^(---+|\*\*\*+|___+)$/.test(text)) return <View key={`rule-${index}`} style={{ height: 1, backgroundColor: theme.border, marginVertical: 14 }} />;
    const heading = text.match(/^#{1,3}\s+(.+)$/);
    if (heading) return <Text key={`heading-${index}`} style={{ color: theme.text, fontSize: heading[0].startsWith('# ') ? 22 : 17, lineHeight: 27, fontWeight: '900', marginTop: index ? 12 : 0 }}>{inlineText(heading[1])}</Text>;
    const bullet = text.match(/^[-*]\s+(.+)$/);
    if (bullet) return <View key={`bullet-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 5 }}><Text style={{ color: theme.primary, fontSize: 16, lineHeight: 22 }}>•</Text><Text style={{ flex: 1, color: theme.subtext, fontSize: 13, lineHeight: 21 }}>{inlineText(bullet[1])}</Text></View>;
    const numbered = text.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) return <View key={`number-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 5 }}><Text style={{ color: theme.primary, fontSize: 12, lineHeight: 22, fontWeight: '900' }}>{numbered[1]}.</Text><Text style={{ flex: 1, color: theme.subtext, fontSize: 13, lineHeight: 21 }}>{inlineText(numbered[2])}</Text></View>;
    return <Text key={`paragraph-${index}`} style={{ color: theme.subtext, fontSize: 13, lineHeight: 21, marginTop: 4 }}>{inlineText(text)}</Text>;
  });
}

export function LoginAgreementCard({
  documents,
  updatedAt,
  revision,
  required,
  accepted,
}: {
  documents: LoginAgreementDocument[];
  updatedAt?: string;
  revision?: string;
  required: boolean;
  accepted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? '');
  const document = documents.find((item) => item.id === selectedId) ?? documents[0];

  useEffect(() => {
    if (!documents.some((item) => item.id === selectedId)) setSelectedId(documents[0]?.id ?? '');
  }, [documents, selectedId]);

  if (!document) return null;

  return <>
    <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: required && !accepted ? theme.primary : theme.border, backgroundColor: theme.cardRaised, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><FileText color={theme.primary} size={18} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 13, fontWeight: '900' }}>{document.title || '服务条款'}</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{accepted ? '本次登录已确认当前版本' : '登录或注册即表示你已阅读并同意'}</Text></View>
        {accepted ? <Check color={theme.success} size={19} /> : <ShieldCheck color={theme.primary} size={19} />}
      </View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: 7 }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>查看服务条款</Text></Pressable>
    </View>

    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>服务条款</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{updatedAt ? `更新于 ${updatedAt}` : '登录或注册时确认当前版本'}{revision ? ` · 版本 ${revision.slice(0, 8)}` : ''}</Text></View>
          <Pressable accessibilityLabel="close-agreement" onPress={() => setOpen(false)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}><X color={theme.subtext} size={19} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 15, backgroundColor: theme.primarySoft }}><ShieldCheck color={theme.primary} size={20} /><Text style={{ flex: 1, color: theme.text, fontSize: 12, lineHeight: 18 }}>登录或注册时，Vexlune 会同步记录你对当前协议版本的同意；官方安全验证仍需单独完成。</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 18 }}>
            {documents.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === document.id }} onPress={() => setSelectedId(item.id)} style={{ borderRadius: 12, paddingHorizontal: 13, minHeight: 36, justifyContent: 'center', backgroundColor: item.id === document.id ? theme.primary : theme.cardRaised, borderWidth: 1, borderColor: item.id === document.id ? theme.primary : theme.border }}><Text style={{ color: item.id === document.id ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '800' }}>{item.title || '协议文档'}</Text></Pressable>)}
          </ScrollView>
          <Text style={{ color: theme.text, fontSize: 22, lineHeight: 28, fontWeight: '900' }}>{document.title || '服务条款'}</Text>
          <View style={{ marginTop: 14 }}>{markdownContent(document.content_md)}</View>
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.page }}><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ minHeight: 48, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>返回登录</Text><ChevronRight color="#FFFFFF" size={15} style={{ position: 'absolute', right: 13 }} /></Pressable></View>
      </SafeAreaView>
    </Modal>
  </>;
}
