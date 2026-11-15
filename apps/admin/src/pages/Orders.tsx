import { Button, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { act, useList } from '../hooks';
import { api, fmt, fmtQty, Me } from '../api';

const UZ: Record<string, string> = { NEW: 'Yangi', ACCEPTED: 'Qabul qilindi', PREPARING: 'Tayyorlanmoqda', READY: 'Tayyor', DELIVERING: 'Yo\'lda', COMPLETED: 'Yakunlandi', CANCELLED: 'Bekor' };
const COLOR: Record<string, string> = { NEW: 'orange', ACCEPTED: 'blue', PREPARING: 'blue', READY: 'green', DELIVERING: 'geekblue', COMPLETED: 'default', CANCELLED: 'red' };
const NEXT = (o: any): [string, string][] => ({
  NEW: [['ACCEPTED', 'Qabul qilish']],
  ACCEPTED: [['PREPARING', 'Tayyorlash']],
  PREPARING: [o.fulfillment === 'PICKUP' ? ['READY', 'Tayyor'] : ['DELIVERING', 'Yo\'lga chiqdi']],
  READY: [['COMPLETED', 'Topshirildi']],
  DELIVERING: [['COMPLETED', 'Yetkazildi']],
} as Record<string, [string, string][]>)[o.status] ?? [];

export default function Orders({ me }: { me: Me }) {
  const [status, setStatus] = useState<string>();
  const { data, loading, reload } = useList(`/admin/orders${status ? `?status=${status}` : ''}`, 20000);
  const staff = useList<any>('/admin/staff');
  const couriers = staff.data.filter((s) => s.role === 'COURIER');
  const ops = me.role !== 'COURIER';

  const setS = (id: number, s: string) => act(() => api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: s } }), 'Holat yangilandi').then(reload);

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>Buyurtmalar</Typography.Title>
        <Select allowClear placeholder="Holat" style={{ width: 170 }} value={status} onChange={setStatus} options={Object.entries(UZ).map(([value, label]) => ({ value, label }))} />
        <Button onClick={reload}>Yangilash</Button>
      </Space>
      <Table rowKey="id" loading={loading} dataSource={data} size="middle" scroll={{ x: 900 }} pagination={{ pageSize: 20 }}
        columns={[
          { title: 'ID', dataIndex: 'code', render: (c, o: any) => <b>{c}</b> },
          { title: 'Mijoz', render: (_, o: any) => <>{o.customer.name}<br /><a href={`tel:${o.phone}`}>{o.phone}</a></> },
          { title: 'Turi', render: (_, o: any) => (o.fulfillment === 'PICKUP' ? '🏪 Olib ketish' : <>🚚 {o.address}</>) },
          { title: 'Jami', render: (_, o: any) => fmt(o.totalFinal ?? o.totalEstimated) },
          { title: 'Holat', render: (_, o: any) => <Tag color={COLOR[o.status]}>{UZ[o.status]}</Tag> },
          { title: 'Kod', dataIndex: 'pickupCode' },
          {
            title: 'Amal', render: (_, o: any) => (
              <Space wrap>
                {NEXT(o).map(([s, label]) => (me.role === 'COURIER' && !(o.status === 'DELIVERING') ? null : <Button key={s} type="primary" size="small" onClick={() => setS(o.id, s)}>{label}</Button>))}
                {ops && ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status) && <Button size="small" danger onClick={() => setS(o.id, 'CANCELLED')}>Bekor</Button>}
                {ops && o.fulfillment === 'DELIVERY' && !['COMPLETED', 'CANCELLED'].includes(o.status) && (
                  <Select size="small" placeholder="Kuryer" style={{ width: 130 }} value={o.courierId ?? undefined}
                    options={couriers.map((c) => ({ value: c.id, label: c.name ?? c.phone }))}
                    onChange={(courierId) => act(() => api(`/admin/orders/${o.id}/courier`, { method: 'PATCH', body: { courierId } }), 'Kuryer biriktirildi').then(reload)} />
                )}
              </Space>
            ),
          },
        ]}
        expandable={{
          expandedRowRender: (o: any) => (
            <Table size="small" rowKey="id" pagination={false} dataSource={o.items} columns={[
              { title: 'Mahsulot', dataIndex: 'name' },
              { title: 'Buyurtma', render: (_, i: any) => fmtQty(i.type, i.quantity) },
              { title: 'Haqiqiy (yig\'ishda)', render: (_, i: any) => i.type === 'WEIGHT' && ['ACCEPTED', 'PREPARING'].includes(o.status) && ops ? (
                <InputNumber size="small" min={0.01} max={40} step={0.01} addonAfter="kg" defaultValue={i.actualQuantity ? i.actualQuantity / 1000 : undefined} placeholder="0.512"
                  onPressEnter={(e) => act(() => api(`/admin/orders/${o.id}/items/${i.id}/weight`, { method: 'PATCH', body: { grams: Math.round(Number((e.target as HTMLInputElement).value) * 1000) } }), 'Narx qayta hisoblandi').then(reload)} />
              ) : (i.actualQuantity ? fmtQty(i.type, i.actualQuantity) : '-') },
              { title: 'Summa', render: (_, i: any) => fmt(i.lineFinal ?? i.lineEstimated) },
            ]} footer={() => (o.note ? `💬 ${o.note}` : 'Og\'irlikni kiritib Enter bosing: narx avtomatik qayta hisoblanadi')} />
          ),
        }}
      />
    </>
  );
}
