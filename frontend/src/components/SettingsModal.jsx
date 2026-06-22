import { useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// --- Hệ thống hằng số và hàm bổ trợ xử lý hình nền (Giữ nguyên) ---
const BACKGROUND_MAX_WIDTH = 1920;
const BACKGROUND_MAX_HEIGHT = 1440;
const BACKGROUND_MIN_WIDTH = 1280;
const BACKGROUND_QUALITY = 0.86;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Unable to load image'));
    };
    image.src = imageUrl;
  });
}

function getCoverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

function getContainRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

async function resizeBackgroundImage(file) {
  const image = await loadImageFromFile(file);
  const viewportRatio = window.innerWidth && window.innerHeight
    ? window.innerWidth / window.innerHeight
    : 16 / 9;
  const deviceAdjustedWidth = Math.round((window.innerWidth || BACKGROUND_MIN_WIDTH) * (window.devicePixelRatio || 1));
  let targetWidth = Math.min(BACKGROUND_MAX_WIDTH, Math.max(BACKGROUND_MIN_WIDTH, deviceAdjustedWidth));
  let targetHeight = Math.round(targetWidth / viewportRatio);

  if (targetHeight > BACKGROUND_MAX_HEIGHT) {
    targetHeight = BACKGROUND_MAX_HEIGHT;
    targetWidth = Math.round(targetHeight * viewportRatio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const coverRect = getCoverRect(image.naturalWidth, image.naturalHeight, targetWidth, targetHeight);
  context.filter = 'blur(28px) brightness(0.72) saturate(1.12)';
  context.drawImage(image, coverRect.x, coverRect.y, coverRect.width, coverRect.height);
  context.filter = 'none';
  context.fillStyle = 'rgba(15, 23, 42, 0.22)';
  context.fillRect(0, 0, targetWidth, targetHeight);

  const containPadding = Math.round(Math.min(targetWidth, targetHeight) * 0.05);
  const containRect = getContainRect(
    image.naturalWidth,
    image.naturalHeight,
    targetWidth - containPadding * 2,
    targetHeight - containPadding * 2
  );
  const imageX = containRect.x + containPadding;
  const imageY = containRect.y + containPadding;

  context.shadowColor = 'rgba(0, 0, 0, 0.28)';
  context.shadowBlur = Math.round(Math.min(targetWidth, targetHeight) * 0.035);
  context.shadowOffsetY = Math.round(Math.min(targetWidth, targetHeight) * 0.012);
  context.drawImage(
    image,
    imageX,
    imageY,
    containRect.width,
    containRect.height
  );
  context.shadowColor = 'transparent';

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', BACKGROUND_QUALITY);
  });

  if (!blob) {
    throw new Error('Unable to resize image');
  }

  return blobToDataUrl(blob);
}

// --- Component Chính Của Modal Cài Đặt ---
function SettingsModal({ open, onClose }) {
  const { 
    backgroundImage, 
    setBackgroundImage, 
    clearBackgroundImage, 
    isSnowEnabled, 
    toggleSnow,
    isTetEffectEnabled, 
    toggleTetEffect 
  } = useTheme();
  
  const backgroundInputRef = useRef(null);

  if (!open) return null;

  const handleChooseBackground = () => {
    backgroundInputRef.current?.click();
  };

  const handleBackgroundChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một file ảnh.');
      event.target.value = '';
      return;
    }

    try {
      const resizedImage = await resizeBackgroundImage(file);
      setBackgroundImage(resizedImage);
      event.target.value = '';
    } catch {
      alert('Không thể đọc ảnh đã chọn. Vui lòng thử lại.');
      event.target.value = '';
    }
  };

  return (
    <div className="cmc-modal-overlay" onClick={onClose}>
      <div className="cmc-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Phần đầu Modal */}
        <div className="cmc-modal-header">
          <h3 className="cmc-modal-title">⚙️ Cài đặt hiển thị</h3>
          <button type="button" className="cmc-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Phần thân chứa các mục cài đặt */}
        <div className="cmc-modal-body">
          
          {/* 🎄 Mục 1: Hiệu ứng tuyết rơi -> Đã đổi thành 1 dòng Bold to */}
          <div className="settings-panel-row">
            <div className="settings-panel-info">
              <span className="settings-panel-icon">❄️</span>
              <div>
                <div className="settings-panel-label" style={{ fontWeight: 'bold', fontSize: '1.02rem' }}>
                  Merry Christmas !
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className={`settings-action-toggle ${isSnowEnabled ? 'active' : ''}`}
              onClick={toggleSnow}
            >
              {isSnowEnabled ? 'Đang Bật' : 'Đang Tắt'}
            </button>
          </div>

          <hr className="settings-panel-divider" />

          {/* 🌸 Mục 2: Hiệu ứng Hoa anh đào -> Đã đổi thành 1 dòng Bold to */}
          <div className="settings-panel-row">
            <div className="settings-panel-info">
              <span className="settings-panel-icon">🌸</span>
              <div>
                <div className="settings-panel-label" style={{ fontWeight: 'bold', fontSize: '1.02rem' }}>
                  Happy New Year !
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className={`settings-action-toggle ${isTetEffectEnabled ? 'active' : ''}`}
              onClick={toggleTetEffect}
            >
              {isTetEffectEnabled ? 'Đang Bật' : 'Đang Tắt'}
            </button>
          </div>

          <hr className="settings-panel-divider" />

          {/* Mục 3: Thay đổi hình nền (Giữ nguyên) */}
          <div className="settings-panel-row">
            <div className="settings-panel-info">
              <span className="settings-panel-icon">🖼️</span>
              <div>
                <div className="settings-panel-label">Hình nền trang web</div>
                <div className="settings-panel-desc">Tải ảnh từ thiết bị của bạn để làm hình nền tùy chỉnh</div>
              </div>
            </div>
            <div className="settings-panel-buttons">
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={handleBackgroundChange}
              />
              <button 
                type="button" 
                className="btn-cmc btn-cmc-primary btn-sm" 
                onClick={handleChooseBackground}
              >
                Chọn ảnh
              </button>
              {backgroundImage ? (
                <button 
                  type="button" 
                  className="btn-cmc btn-danger btn-sm" 
                  onClick={clearBackgroundImage}
                >
                  Xóa nền
                </button>
              ) : null}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SettingsModal;