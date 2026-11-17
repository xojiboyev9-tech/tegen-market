import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

export default function Stats() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api('/admin/stats').then(setS).catch(() => {}); }, []);
  if (!s) return null;
  const max = Math.max(1, ...s.daily.map((d: any) => d.revenue));
  const box = (title: string, v: { orders: number; revenue: number }) => (
    <Col xs={24} md={8}><Card><Statistic title={title} value={fmt(v.revenue)} /><div style={{ color: '#888' }}>{v.orders} ta buyurtma</div></Card></Col>
  );
  return (
    <>
      <Typography.Title level={4}>Statistika</Typography.Title>
      <Row gutter={[12, 12]}>{box('Bugun', s.today)}{box('So\'nggi 7 kun', s.week)}{box('So\'nggi 30 kun', s.month)}</Row>
      <Card title="Kunlik savdo (30 kun)" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }} role="img" aria-label="Kunlik savdo grafigi">
          {s.daily.map((d: any) => <div key={d.day} title={`${new Date(d.day).toLocaleDateString('uz-UZ')}: ${fmt(d.revenue)}`} style={{ flex: 1, background: '#fb0200', borderRadius: '4px 4px 0 0', height: `${Math.max(4, (d.revenue / max) * 100)}%` }} />)}
        </div>
      </Card>
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}><Card title="Eng ko'p sotilgan mahsulotlar"><Table size="small" pagination={false} rowKey="name" dataSource={s.topProducts} columns={[{ title: 'Mahsulot', dataIndex: 'name' }, { title: 'Buyurtma', dataIndex: 'orders' }, { title: 'Summa', render: (_, r: any) => fmt(r.revenue) }]} /></Card></Col>
        <Col xs={24} lg={12}><Card title="Eng faol mijozlar"><Table size="small" pagination={false} rowKey="id" dataSource={s.topCustomers} columns={[{ title: 'Mijoz', render: (_, r: any) => `${r.name ?? '-'} ${r.phone ?? ''}` }, { title: 'Buyurtma', dataIndex: 'orders' }, { title: 'Summa', render: (_, r: any) => fmt(r.spent) }]} /></Card></Col>
      </Row>
    </>
  );
}
