import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal'; 
import { useAuth } from '../contexts/AuthContext';

// 1. IMPORT CÁC THÀNH PHẦN MỚI
import { useTheme } from '../contexts/ThemeContext'; // Lấy hook quản lý theme
import TetEffect from './TetEffect';                 // Gọi hiệu ứng lì xì & đồng xu rơi

function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  
  // 2. TRÍCH XUẤT TRẠNG THÁI HIỆU ỨNG TẾT TỪ CONTEXT
  // Biến 'isTetEffectEnabled' này tự động chuyển thành true nếu đúng dịp 29/1, hoặc dựa vào cấu hình user bấm
  const { isDarkMode, toggleDarkMode, isTetEffectEnabled } = useTheme(); 
  
  const [authOpen, setAuthOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Effect tự động đóng dropdown thông tin cá nhân khi người dùng click ra ngoài khu vực menu
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

          {/* Vùng 1: LOGO THƯƠNG HIỆU */}
          <Link to="/" className="cmc-logo">
            📚 CMC Truyện
          </Link>

          {/* Vùng 2: THANH LIÊN KẾT ĐIỀU HƯỚNG CHÍNH */}
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

          {/* Vùng 3: CÁC NÚT CHỨC NĂNG BÊN PHẢI */}
          <div className="cmc-nav-actions" style={{ position: 'relative' }}>
            
            {/* Nút bánh răng mở Modal cài đặt hiển thị (nơi sẽ chứa nút bật/tắt Lì xì) */}
            <button
              type="button"
              className="btn-theme-toggle"
              onClick={() => setSettingsOpen(true)}
              title="Cài đặt hiển thị"
              aria-label="Cài đặt hiển thị"
            >
              ⚙️
            </button>

            {/* Nút bật/tắt chế độ giao diện Sáng / Tối */}
            <button
              type="button"
              className="btn-theme-toggle"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Dropdown quản lý tài khoản khi đã đăng nhập thành công */}
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
                      alt="Avatar"
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

                    <Link to="/profile" className="dropdown-item-cmc" onClick={() => setDropdownOpen(false)}>📚 Tủ sách & Hồ sơ</Link>
                    <Link to="/account" className="dropdown-item-cmc" onClick={() => setDropdownOpen(false)}>⚙️ Cài đặt tài khoản</Link>
                    
                    {user?.role === 'Uploader' && (
                      <Link to="/dashboard" className="dropdown-item-cmc" onClick={() => setDropdownOpen(false)}>✍️ Quản lý truyện</Link>
                    )}

                    {user?.role === 'Admin' && (
                      <Link to="/admin" className="dropdown-item-cmc" onClick={() => setDropdownOpen(false)}>🛡️ Hệ thống Admin</Link>
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
              // Nút đăng nhập hiển thị mặc định nếu chưa có session đăng nhập
              <button type="button" className="btn-cmc btn-cmc-primary btn-sm" onClick={() => setAuthOpen(true)}>
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Render các cửa sổ Modal tính năng */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      {/* 3. ĐẶT THẺ HIỆU ỨNG CHẠY TOÀN CỤC Ở ĐÂY */}
      {/* Thẻ này nằm ngoài thẻ <header> để không bị ảnh hưởng bởi CSS layout của thanh điều hướng */}
      <TetEffect enabled={isTetEffectEnabled} />
    </>
  );
}

export default Navbar;