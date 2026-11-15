import { Button, Drawer, Input, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { act, useList } from '../hooks';

export default function Support() {
  const { data, loading, reload } = useList('/admin/support', 20000);
  const [open, setOpen] = useState<any | null>(null);
  const [text, setText] = useState('');
  const cur = open && data.find((t: any) => t.id === open.id);
  const send = async () => {
    if (!text.trim()) return;
    if (await act(() => api(`/admin/support/${cur.id}/reply`, { method: 'POST', body: { text } }), 'Yuborildi')) { setText(''); reload(); }
  };
  return (
    <>
      <Typography.Title level={4}>Murojaatlar</Typography.Title>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={false} columns={[
        { title: 'Mijoz', render: (_, t: any) => <>{t.user.name}<br />{t.user.phone}</> },
        { title: 'Oxirgi xabar', render: (_, t: any) => { const m = t.messages[0]; return m ? <>{m.direction === 'IN' ? <Tag color="red">Mijoz</Tag> : <Tag>Biz</Tag>}{m.kind === 'text' ? m.text : `[${m.kind}] ${m.text ?? ''}`}</> : '-'; } },
        { title: 'Vaqt', dataIndex: 'lastMessageAt', render: (d: string) => new Date(d).toLocaleString('uz-UZ') },
        { title: '', render: (_, t: any) => <Button size="small" onClick={() => setOpen(t)}>Ochish</Button> },
      ]} />
      <Drawer open={!!cur} onClose={() => setOpen(null)} title={cur?.user.name} width={420}>
        <div style={{ display: 'grid', gap: 8, marginBottom: 80 }}>
          {[...(cur?.messages ?? [])].reverse().map((m: any) => (
            <div key={m.id} style={{ justifySelf: m.direction === 'OUT' ? 'end' : 'start', background: m.direction === 'OUT' ? '#fb0200' : '#f3f1f1', color: m.direction === 'OUT' ? '#fff' : 'inherit', padding: '8px 12px', borderRadius: 12, maxWidth: '85%' }}>
              {m.kind === 'text' ? m.text : `[${m.kind}] ${m.text ?? ''}`}
              {m.kind !== 'text' && <div style={{ fontSize: 11, opacity: .7 }}>Rasm/ovoz/video botda ko'rinadi (xabarga reply qiling)</div>}
            </div>
          ))}
        </div>
        <Space.Compact style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} onPressEnter={send} placeholder="Javob yozing" maxLength={2000} />
          <Button type="primary" onClick={send}>Yuborish</Button>
        </Space.Compact>
      </Drawer>
    </>
  );
}
