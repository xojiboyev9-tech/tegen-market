import { Button, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { act, useList } from '../hooks';

const ST: Record<string, [string, string]> = { PENDING: ['Kutmoqda', 'orange'], LINKED: ['Biriktirilgan', 'green'], REJECTED: ['Rad etilgan', 'red'] };

export default function Cards() {
  const { data, loading, reload } = useList('/admin/cards');
  const [link, setLink] = useState<any | null>(null);
  const [code, setCode] = useState('');
  return (
    <>
      <Typography.Title level={4}>Diskont kartalar</Typography.Title>
      <Table rowKey="id" loading={loading} dataSource={data} columns={[
        { title: 'Mijoz', render: (_, c: any) => <>{c.user.name}<br />{c.user.phone}</> },
        { title: 'Karta', render: (_, c: any) => c.number ?? 'Rasm (botda ko\'ring)' },
        { title: 'Offline kod', dataIndex: 'externalCode' },
        { title: 'Holat', render: (_, c: any) => <Tag color={ST[c.status][1]}>{ST[c.status][0]}</Tag> },
        { title: '', render: (_, c: any) => c.status === 'PENDING' && (
          <Space><Button size="small" type="primary" onClick={() => { setLink(c); setCode(c.number ?? ''); }}>Biriktirish</Button>
            <Button size="small" danger onClick={() => act(() => api(`/admin/cards/${c.id}`, { method: 'PATCH', body: { status: 'REJECTED' } }), 'Rad etildi').then(reload)}>Rad etish</Button></Space>) },
      ]} />
      <Modal open={!!link} title="Offline dasturdagi karta kodi" onCancel={() => setLink(null)} okText="Biriktirish"
        onOk={async () => { if (await act(() => api(`/admin/cards/${link.id}`, { method: 'PATCH', body: { status: 'LINKED', externalCode: code } }), 'Biriktirildi')) { setLink(null); reload(); } }}>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Karta kodi" maxLength={64} />
      </Modal>
    </>
  );
}
