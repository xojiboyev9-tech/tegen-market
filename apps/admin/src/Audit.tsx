import { Table, Typography } from 'antd';
import { useList } from '../hooks';

export default function Audit() {
  const { data, loading } = useList('/admin/audit');
  return (
    <>
      <Typography.Title level={4}>Audit jurnali</Typography.Title>
      <Table rowKey="id" size="small" loading={loading} dataSource={data} pagination={{ pageSize: 30 }} columns={[
        { title: 'Vaqt', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleString('uz-UZ') },
        { title: 'Kim', render: (_, a: any) => (a.actorId ? `#${a.actorId} ${a.actorRole}` : 'Tizim') },
        { title: 'Harakat', dataIndex: 'action' },
        { title: 'Obyekt', render: (_, a: any) => `${a.entity} ${a.entityId ?? ''}` },
        { title: 'Tafsilot', dataIndex: 'meta', render: (m: unknown) => (m ? <code>{JSON.stringify(m)}</code> : '') },
      ]} />
    </>
  );
}
