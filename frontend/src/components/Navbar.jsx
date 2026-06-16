import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthModal from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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

function loadImageFromFile(file) {
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

function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDarkMode, toggleDarkMode, setBackgroundImage } = useTheme();
  const [authOpen, setAuthOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const backgroundInputRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <>
      <header className="cmc-site-header">
        <div className="cmc-navbar-inner">

          <Link to="/" className="cmc-logo">
            📚 CMC Truyện
          </Link>

          <nav className="cmc-nav-links">
            <Link to="/" className="cmc-nav-link">
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Trang chủ</span>
            </Link>

            <Link to="/tim-truyen" className="cmc-nav-link">
              <span className="nav-icon">🔍</span>
              <span className="nav-text">Tìm truyện</span>
            </Link>

            {isAuthenticated ? (
              <Link to="/profile" className="cmc-nav-link">
                <span className="nav-icon">📚</span>
                <span className="nav-text">Tủ sách</span>
              </Link> 
            ) : (
              <button
                type="button"
                className="cmc-nav-link"
                onClick={() => setAuthOpen(true)}
              >
                <span className="nav-icon">👤</span>
                <span className="nav-text">Đăng nhập</span>
              </button>
                          )}  
          </nav>

          <div className="cmc-nav-actions" style={{ position: 'relative' }}>
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={handleBackgroundChange}
            />
            <button
              type="button"
              className="btn-theme-toggle"
              onClick={handleChooseBackground}
              title="Đổi ảnh nền"
              aria-label="Đổi ảnh nền"
            >
              🖼️
            </button>
            <button
              type="button"
              className="btn-theme-toggle"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Bật sáng' : 'Bật tối'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {isAuthenticated ? (
              <div className="nav-profile-dropdown-container" ref={dropdownRef}>
                <button
                  type="button"
                  className="nav-profile-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="rounded-circle"
                      style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-brand"
                      style={{ width: '28px', height: '28px', fontSize: '0.8rem', minWidth: '28px' }}
                    >
                      {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="nav-username d-none d-md-inline" style={{ maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.full_name || user?.username}
                  </span>
                  <span className="nav-caret">▼</span>
                </button>

                {dropdownOpen && (
                  <div className="nav-profile-dropdown-menu">
                    <div className="px-3 py-2 border-bottom mb-2">
                      <div className="fw-semibold text-truncate" style={{ color: 'var(--text)' }}>
                        {user?.full_name || user?.username}
                      </div>
                      <div className="small text-muted text-truncate" style={{ fontSize: '0.8rem' }}>{user?.email}</div>
                      <span className="badge text-bg-primary mt-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{user?.role}</span>
                    </div>

                    <Link
                      to="/profile"
                      className="dropdown-item-cmc"
                      onClick={() => setDropdownOpen(false)}
                    >
                      📚 Tủ sách & Hồ sơ
                    </Link>

                    <Link
                      to="/account"
                      className="dropdown-item-cmc"
                      onClick={() => setDropdownOpen(false)}
                    >
                      ⚙️ Cài đặt tài khoản
                    </Link>
                    {user?.role === 'Uploader' && (
                      <Link
                        to="/dashboard"
                        className="dropdown-item-cmc"
                        onClick={() => setDropdownOpen(false)}
                      >
                        ✍️ Quản lý truyện
                      </Link>
                    )}

                    {user?.role === 'Admin' && (
                      <Link
                        to="/admin"
                        className="dropdown-item-cmc"
                        onClick={() => setDropdownOpen(false)}
                      >
                        🛡️ Hệ thống Admin
                      </Link>
                    )}

                    <div className="dropdown-divider border-top my-2"></div>

                    <button
                      type="button"
                      className="dropdown-item-cmc btn-logout-cmc"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" className="btn-cmc btn-cmc-primary btn-sm" onClick={() => setAuthOpen(true)}>
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export default Navbar;
