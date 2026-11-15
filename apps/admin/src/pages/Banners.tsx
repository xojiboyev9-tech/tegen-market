import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { act, useList } from '../hooks';
import { ImageField } from './Products';

export default function Banners() {
  const { data, loading, reload } = useList('/admin/banners');
  const cats = useList<any>('/admin/categories');
  const [edit, setEdit] = useState<any | null>(null);
  const [form] = Form.useForm();
  const open = (b: any | null) => { setEdit(b ?? {}); form.resetFields(); form.setFieldsValue(b ?? { isActive: true, sortOrder: 0 }); };
  const save = async () => {
    const v = await form.validateFields();
    if (await act(() => api(edit.id ? `/admin/banners/${edit.id}` : '/admin/banners', { method: edit.id ? 'PATCH' : 'POST', body: v }))) { setEdit(null); reload(); }
  };
  return (
    <>
      <Space style={{ marginBottom: 12 }}><Typography.Title level={4} style={{ margin: 0 }}>Bannerlar</Typography.Title><Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>Qo'shish</Button></Space>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={false} columns={[
        { title: 'Sarlavha', dataIndex: 'title' }, { title: 'Tavsif', dataIndex: 'subtitle' },
        { title: 'Faol', dataIndex: 'isActive', render: (a: boolean) => (a ? 'Ha' : 'Yo\'q') },
        { title: '', render: (_, b: any) => <Space><Button size="small" onClick={() => open(b)}>Tahrirlash</Button>
          <Popconfirm title="O'chirilsinmi?" onConfirm={() => act(() => api(`/admin/banners/${b.id}`, { method: 'DELETE' }), 'O\'chirildi').then(reload)}><Button size="small" danger>O'chirish</Button></Popconfirm></Space> },
      ]} />
      <Modal open={!!edit} title="Banner" onCancel={() => setEdit(null)} onOk={save} okText="Saqlash" destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true, min: 2 }]}><Input maxLength={120} placeholder="Bugun barcha tortlarga 15% chegirma" /></Form.Item>
          <Form.Item name="subtitle" label="Qisqa matn"><Input maxLength={160} /></Form.Item>
          <Form.Item name="buttonText" label="Tugma matni"><Input maxLength={30} /></Form.Item>
          <Form.Item name="categoryId" label="Bosilganda ochiladigan bo'lim"><Select allowClear options={cats.data.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
          <Form.Item name="imageUrl" label="Rasm (ixtiyoriy)"><ImageField /></Form.Item>
          <Space size="large"><Form.Item name="sortOrder" label="Tartib"><InputNumber /></Form.Item><Form.Item name="isActive" label="Faol" valuePropName="checked"><Switch /></Form.Item></Space>
        </Form>
      </Modal>
    </>
  );
}
