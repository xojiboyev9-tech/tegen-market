import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { act, useList } from '../hooks';

const ROLE_UZ: Record<string, string> = { SUPER_ADMIN: 'Super admin', CATEGORY_ADMIN: 'Bo\'lim admini (xodim)', OPERATOR: 'Operator', COURIER: 'Kuryer' };

export default function Staff() {
  const { data, loading, reload } = useList('/admin/staff');
  const cats = useList<any>('/admin/categories');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const role = Form.useWatch('role', form);
  const save = async () => {
    const v = await form.validateFields();
    if (await act(() => api('/admin/staff', { method: 'POST', body: { ...v, categoryIds: v.categoryIds ?? [] } }), 'Xodim qo\'shildi')) { setOpen(false); reload(); }
  };
  return (
    <>
      <Space style={{ marginBottom: 12 }}><Typography.Title level={4} style={{ margin: 0 }}>Xodimlar</Typography.Title><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>Xodim qo'shish</Button></Space>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={false} columns={[
        { title: 'Ism', dataIndex: 'name' }, { title: 'Telefon', dataIndex: 'phone' },
        { title: 'Rol', dataIndex: 'role', render: (r: string) => <Tag>{ROLE_UZ[r]}</Tag> },
        { title: 'Bo\'limlar', render: (_, s: any) => s.categories.map((c: any) => <Tag key={c.categoryId}>{cats.data.find((x) => x.id === c.categoryId)?.name}</Tag>) },
        { title: '', render: (_, s: any) => <Popconfirm title="Xodimlikdan chiqarilsinmi?" onConfirm={() => act(() => api(`/admin/staff/${s.id}`, { method: 'DELETE' }), 'Olib tashlandi').then(reload)}><Button size="small" danger>Olib tashlash</Button></Popconfirm> },
      ]} />
      <Modal open={open} title="Xodim qo'shish" onCancel={() => setOpen(false)} onOk={save} okText="Qo'shish" destroyOnClose>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Xodim avval botda /start bosib, telefon raqamini yuborgan bo'lishi kerak." />
        <Form form={form} layout="vertical">
          <Form.Item name="phone" label="Telefon raqami" rules={[{ required: true }]}><Input placeholder="+998 90 123 45 67" /></Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}><Select options={Object.entries(ROLE_UZ).map(([value, label]) => ({ value, label }))} /></Form.Item>
          {role === 'CATEGORY_ADMIN' && <Form.Item name="categoryIds" label="Boshqaradigan bo'limlar (masalan: nonvoy, kolbasachi)" rules={[{ required: true }]}><Select mode="multiple" options={cats.data.map((c) => ({ value: c.id, label: `${c.emoji ?? ''} ${c.name}` }))} /></Form.Item>}
        </Form>
      </Modal>
    </>
  );
}
