import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Card, Page, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { createAdminAnnouncement, deleteAdminAnnouncement, listAdminAnnouncements, type AdminAnnouncement } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

export default function AdminAnnouncementsScreen() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const createKey = useRef('');
  const query = useQuery({ queryKey: ['admin-announcements'], queryFn: () => listAdminAnnouncements({ page_size: 50 }) });
  const create = useMutation({ mutationFn: () => { if (!createKey.current) createKey.current = newIdempotencyKey('admin-announcement-create'); return createAdminAnnouncement({ title: title.trim(), content: content.trim(), status: 'active', notify_mode: 'popup' }, createKey.current); }, onSuccess: () => { createKey.current = ''; setOpen(false); setTitle(''); setContent(''); void client.invalidateQueries({ queryKey: ['admin-announcements'] }); } });
  const remove = useMutation({ mutationFn: (id: number) => deleteAdminAnnouncement(id), onSuccess: () => void client.invalidateQueries({ queryKey: ['admin-announcements'] }) });
  const items = query.data?.items ?? [];
  function confirmDelete(item: AdminAnnouncement) {
    Alert.alert('删除公告', `确认删除「${item.title}」？此操作不可撤销。`, [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => remove.mutate(item.id) }]);
  }
  return <Page title="公告与通知" subtitle="服务端真实公告、发布状态与阅读范围" right={<Pressable accessibilityLabel="create-announcement" onPress={() => setOpen(true)} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}><Plus color="#fff" size={20} /></Pressable>} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} onRetry={() => void query.refetch()} emptyText="暂无服务端公告" />
    {query.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(query.error)}</Text> : null}
    <View style={{ gap: 10 }}>{items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Bell color={theme.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 6 }} numberOfLines={3}>{item.content}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 8 }}>{item.status || '--'} · {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'}</Text></View><Pressable accessibilityLabel={`delete-announcement-${item.id}`} onPress={() => confirmDelete(item)} disabled={remove.isPending} style={{ padding: 8 }}><Trash2 color={theme.danger} size={17} /></Pressable></View></Card>)}</View>
    <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }}><View style={{ backgroundColor: theme.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: theme.text, fontWeight: '900', fontSize: 20 }}>发布公告</Text><Pressable onPress={() => setOpen(false)}><X color={theme.subtext} size={21} /></Pressable></View><TextInput accessibilityLabel="announcement-title" value={title} onChangeText={setTitle} placeholder="标题" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14, marginTop: 17 }} /><TextInput accessibilityLabel="announcement-content" value={content} onChangeText={setContent} multiline placeholder="正文" placeholderTextColor={theme.faint} style={{ minHeight: 130, textAlignVertical: 'top', color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14, marginTop: 10 }} />{create.error ? <Text style={{ color: theme.danger, marginTop: 10 }}>{humanizeApiError(create.error)}</Text> : null}<Pressable disabled={!title.trim() || !content.trim() || create.isPending} onPress={() => create.mutate()} style={{ marginTop: 15, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: !title.trim() || !content.trim() || create.isPending ? theme.muted : theme.primary }}><Text style={{ color: '#fff', fontWeight: '900' }}>{create.isPending ? '提交中…' : '发布到服务端'}</Text></Pressable></View></View></Modal>
  </Page>;
}
