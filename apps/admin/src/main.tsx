import { ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#fb0200', borderRadius: 10, fontFamily: "'Onest', system-ui, sans-serif" } }}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
