import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Radio, Select, Space, Switch, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { useState } from 'react';
import { api, fmt, Me, upload } from '../api';
import { act, useList } from '../hooks';

const ST: Record<string, [string, string]> = { PENDING: ['Tasdiq kutmoqda', 'orange'], ACTIVE: ['Sotuvda', 'green'], HIDDEN: ['Yashirin', 'default'], REJECTED: ['Rad etilgan', 'red'] };

export default function Products({ me }: { me: Me }) {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const query = tab === 'proposals' ? '?proposals=1' : `?q=${encodeURIComponent(q)}`;
  const { data, loading, reload } = useList(`/admin/products${query}`);
  const cats = useList<any>('/admin/categories');
  const [edit, setEdit] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [form] = Form.useForm();
  const superAdmin = me.role === 'SUPER_ADMIN';
  const canEdit = me.role === 'SUPER_ADMIN' || me.role === 'CATEGORY_ADMIN';
  const myCats = cats.data.filter((c) => superAdmin || me.categoryIds.includes(c.id));

  const open = (p: any | null) => { setEdit(p ?? {}); form.resetFields(); form.setFieldsValue(p ?? { type: 'PIECE', status: 'ACTIVE' }); };
  const save = async () => {
    const v = await form.validateFields();
    const body = { ...v, description: v.description || null, oldPrice: v.oldPrice || null };
    if (!superAdmin) { delete body.status; delete body.isTrending; }
    const ok = await act(() => api(edit.id ? `/admin/products/${edit.id}` : '/admin/products', { method: edit.id ? 'PATCH' : 'POST', body }),
      superAdmin ? 'Saqlandi' : 'Tasdiqlash uchun yuborildi');
    if (ok) { setEdit(null); reload(); }
  };

  const columns = [
    { title: '', dataIndex: 'imageUrl', width: 56, render: (u: string) => (u ? <img src={u} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 8 }} alt="" /> : '🛒') },
    { title: 'Nomi', dataIndex: 'name' },
    { title: 'Bo\'lim', render: (_: unknown, p: any) => p.category?.name },
    { title: 'Narx', render: (_: unknown, p: any) => <>{fmt(p.price)}{p.type === 'WEIGHT' ? ' / kg' : ''}</> },
    { title: 'Holat', render: (_: unknown, p: any) => <><Tag color={ST[p.status][1]}>{ST[p.status][0]}</Tag>{p.hasPending && <Tag color="gold">O'zgarish kutmoqda</Tag>}{p.rejectReason && <div style={{ fontSize: 12, color: '#c00' }}>{p.rejectReason}</div>}</> },
    {
      title: 'Amal', render: (_: unknown, p: any) => (
        <Space wrap>
          {canEdit && <Button size="small" onClick={() => open(p)}>Tahrirlash</Button>}
          {superAdmin && (p.status === 'PENDING' || p.hasPending) && <>
            <Button size="small" type="primary" onClick={() => act(() => api(`/admin/products/${p.id}/approve`, { method: 'POST' }), 'Tasdiqlandi').then(reload)}>Tasdiqlash</Button>
            <Button size="small" danger onClick={() => setRejecting(p)}>Rad etish</Button>
          </>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>Mahsulotlar</Typography.Title>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>Qo'shish</Button>}
        <Input.Search allowClear placeholder="Qidirish" onSearch={setQ} style={{ width: 220 }} />
      </Space>
      <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'all', label: 'Hammasi' }, { key: 'proposals', label: 'Tasdiq kutmoqda' }]} />
      <Table rowKey="id" size="middle" loading={loading} dataSource={data} columns={columns} scroll={{ x: 800 }} pagination={{ pageSize: 20 }}
        expandable={{ rowExpandable: (p: any) => p.hasPending, expandedRowRender: (p: any) => <pre style={{ margin: 0 }}>{JSON.stringify(p.pending, null, 2)}</pre> }} />

      <Modal open={!!edit} title={edit?.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'} onCancel={() => setEdit(null)} onOk={save} okText="Saqlash" destroyOnClose>
        {!superAdmin && <Typography.Paragraph type="secondary">O'zgarish admin tasdiqlagandan so'ng ilovada ko'rinadi.</Typography.Paragraph>}
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nomi" rules={[{ required: true, min: 2 }]}><Input maxLength={120} /></Form.Item>
          <Form.Item name="categoryId" label="Bo'lim" rules={[{ required: true }]}><Select options={myCats.map((c) => ({ value: c.id, label: `${c.emoji ?? ''} ${c.name}` }))} /></Form.Item>
          <Form.Item name="type" label="Turi"><Radio.Group options={[{ value: 'PIECE', label: 'Dona' }, { value: 'WEIGHT', label: 'Og\'irlik (kg)' }]} /></Form.Item>
          <Space>
            <Form.Item name="price" label="Narx (so'm, kg yoki dona uchun)" rules={[{ required: true }]}><InputNumber min={100} step={500} style={{ width: 200 }} /></Form.Item>
            <Form.Item name="oldPrice" label="Eski narx (aksiya)"><InputNumber min={100} step={500} style={{ width: 160 }} /></Form.Item>
          </Space>
          <Form.Item name="description" label="Tavsif"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
          <Form.Item name="imageUrl" label="Rasm">
            <ImageField />
          </Form.Item>
          {superAdmin && <Space size="large">
            <Form.Item name="status" label="Holat"><Radio.Group options={[{ value: 'ACTIVE', label: 'Sotuvda' }, { value: 'HIDDEN', label: 'Yashirin' }]} /></Form.Item>
            <Form.Item name="isTrending" label="Trendda" valuePropName="checked"><Switch /></Form.Item>
          </Space>}
        </Form>
      </Modal>

      <Modal open={!!rejecting} title="Rad etish sababi" onCancel={() => setRejecting(null)} okText="Rad etish" okButtonProps={{ danger: true }}
        onOk={async () => {
          const reason = (document.getElementById('reject-reason') as HTMLInputElement).value;
          if (await act(() => api(`/admin/products/${rejecting.id}/reject`, { method: 'POST', body: { reason } }), 'Rad etildi')) { setRejecting(null); reload(); }
        }}>
        <Input id="reject-reason" placeholder="Masalan: rasm sifatsiz" maxLength={300} />
      </Modal>
    </>
  );
}

function ImageField({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Space align="center">
      {value && <img src={value} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 10 }} alt="" />}
      <Upload showUploadList={false} accept="image/jpeg,image/png,image/webp" beforeUpload={async (f) => {
        setBusy(true);
        try { onChange?.(await upload(f)); } catch (e) { Modal.error({ title: (e as Error).message }); } finally { setBusy(false); }
        return false;
      }}><Button icon={<UploadOutlined />} loading={busy}>Rasm yuklash</Button></Upload>
    </Space>
  );
}
export { ImageField };
