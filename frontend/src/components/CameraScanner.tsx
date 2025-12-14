import { Modal, Button } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [error, setError] = useState<string>('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!visible) {
      // 关闭时清理
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {}).finally(() => {
          qrRef.current?.clear();
          qrRef.current = null;
        });
      }
      setError('');
      return;
    }

    const start = async () => {
      try {
        setError('');
        const html5QrCode = new Html5Qrcode(scannerId);
        qrRef.current = html5QrCode;
        
        // 获取可用的摄像头设备
        const devices = await Html5Qrcode.getCameras();
        if (devices.length === 0) {
          setError('未检测到摄像头设备，请检查设备权限');
          return;
        }

        // 优先使用后置摄像头
        const cameraId = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'))?.id || devices[0].id;

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdgePercentage = 0.7;
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0,
          },
          (decoded) => {
            onResult(decoded);
            onClose();
          },
          () => {
            // 忽略扫描错误，继续扫描
          }
        );
      } catch (err: any) {
        console.error('摄像头启动失败:', err);
        if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
          setError('需要摄像头权限，请在浏览器设置中允许访问摄像头');
        } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
          setError('未找到摄像头设备');
        } else {
          setError(err.message || '摄像头启动失败，请重试');
        }
      }
    };
    
    start();
    
    return () => {
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {}).finally(() => {
          qrRef.current?.clear();
          qrRef.current = null;
        });
      }
    };
  }, [visible, onClose, onResult, scannerId]);

  const handleRetry = () => {
    setRetrying(true);
    setError('');
    if (qrRef.current) {
      qrRef.current.stop().catch(() => {}).finally(() => {
        qrRef.current?.clear();
        qrRef.current = null;
        setRetrying(false);
        // 重新触发启动
        setTimeout(() => {
          const start = async () => {
            try {
              const html5QrCode = new Html5Qrcode(scannerId);
              qrRef.current = html5QrCode;
              const devices = await Html5Qrcode.getCameras();
              const cameraId = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'))?.id || devices[0].id;
              await html5QrCode.start(
                cameraId,
                {
                  fps: 10,
                  qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdgePercentage = 0.7;
                    const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                    return { width: qrboxSize, height: qrboxSize };
                  },
                  aspectRatio: 1.0,
                },
                (decoded) => {
                  onResult(decoded);
                  onClose();
                },
                () => {}
              );
            } catch (err: any) {
              setError(err.message || '摄像头启动失败');
            }
          };
          start();
        }, 100);
      });
    }
  };

  return (
    <Modal
      title={title || '摄像头扫码'}
      open={visible}
      footer={null}
      onCancel={onClose}
      destroyOnClose
      width="90%"
      style={{ maxWidth: 500 }}
    >
      <div id={scannerId} style={{ width: '100%', minHeight: 300, position: 'relative' }} />
      {error ? (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>
          <Button type="primary" onClick={handleRetry} loading={retrying}>
            重试
          </Button>
        </div>
      ) : (
        <div style={{ marginTop: 8, color: '#888', textAlign: 'center' }}>
          将二维码/条码对准取景框，自动识别
        </div>
      )}
    </Modal>
  );
}


