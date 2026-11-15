import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Space, Switch, Table, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { act, useList } from '../hooks';

export default function Categories() {
  const { data, loading, reload } = useList('/admin/categories');
  const [edit, setEdit] = useState<any | null>(null);
  const [form] = Form.useForm();
  const open = (c: any | null) => { setEdit(c ?? {}); form.resetFields(); form.setFieldsValue(c ?? { isActive: true, sortOrder: 0 }); };
  const save = async () => {
    const v = await form.validateFields();
    if (await act(() => api(edit.id ? `/admin/categories/${edit.id}` : '/admin/categories', { method: edit.id ? 'PATCH' : 'POST', body: v }))) { setEdit(null); reload(); }
  };
  return (
    <>
      <Space style={{ marginBottom: 12 }}><Typography.Title level={4} style={{ margin: 0 }}>Kategoriyalar</Typography.Title><Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>Qo'shish</Button></Space>
      <Table rowKey="id" loading={loading} dataSource={data} pagination={false} columns={[
        { title: '', dataIndex: 'emoji', width: 50 }, { title: 'Nomi', dataIndex: 'name' }, { title: 'Tartib', dataIndex: 'sortOrder' },
        { title: 'Faol', dataIndex: 'isActive', render: (a: boolean) => (a ? 'Ha' : 'Yo\'q') },
        { title: '', render: (_, c: any) => <Button size="small" onClick={() => open(c)}>Tahrirlash</Button> },
      ]} />
      <Modal open={!!edit} title="Kategoriya" onCancel={() => setEdit(null)} onOk={save} okText="Saqlash" destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nomi" rules={[{ required: true, min: 2 }]}><Input maxLength={60} /></Form.Item>
          <Form.Item name="emoji" label="Emoji"><Input maxLength={8} style={{ width: 100 }} /></Form.Item>
          <Form.Item name="sortOrder" label="Tartib raqami"><InputNumber /></Form.Item>
          <Form.Item name="isActive" label="Faol" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
