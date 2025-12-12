import { Modal } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraScannerProps {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  title?: string;
}

export default function CameraScanner({ visible, onClose, onResult, title }: CameraScannerProps) {
  const scannerId = useMemo(() => `scanner-${Math.random().toString(36).slice(2)}`, []);
  const qrRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!visible) return;
    const start = async () => {
      const html5QrCode = new Html5Qrcode(scannerId);
      qrRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            onResult(decoded);
            onClose();
          },
          () => {}
        );
      } catch (err) {
        onClose();
      }
    };
    start();
    return () => {
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {}).finally(() => {
          qrRef.current?.clear().catch(() => {});
          qrRef.current = null;
        });
      }
    };
  }, [visible, onClose, onResult, scannerId]);

  return (
    <Modal
      title={title || '摄像头扫码'}
      open={visible}
      footer={null}
      onCancel={onClose}
      destroyOnClose
    >
      <div id={scannerId} style={{ width: '100%', minHeight: 260 }} />
      <div style={{ marginTop: 8, color: '#888' }}>将二维码/条码对准取景框，自动识别</div>
    </Modal>
  );
}


