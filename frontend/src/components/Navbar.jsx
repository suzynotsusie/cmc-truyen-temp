import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';

import AuthModal from './AuthModal';
import TopupModal from './TopupModal';
import NotificationBell from './NotificationBell';
import LogoMark from './LogoMark';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  FontAwesomeIcon,
  faBookOpen,
  faChevronDown,
  faClockRotateLeft,
  faGear,
  faGem,
  faHouse,
  faLightbulb,
  faMagnifyingGlass,
  faMoon,
  faPenNib,
  faRankingStar,
  faRightFromBracket,
  faShieldHalved,
  faUser,
} from '../lib/icons';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [authOpen, setAuthOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
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

  const isHome = location.pathname === '/';
  const isStoryDetail = location.pathname.startsWith('/story/');
  const headerClass = [
    'cmc-site-header',
    isHome ? 'is-on-home' : '',
    isStoryDetail ? 'is-on-story' : '',
    isScrolled ? 'is-scrolled' : 'is-at-top',
  ].filter(Boolean).join(' ');

  return (
    <>
      <header className={headerClass}>
        <div className="cmc-navbar-inner">

          <Link to="/" className="cmc-logo">
            <LogoMark />
          </Link>

          <nav className="cmc-nav-links" aria-label="Điều hướng chính">
            <NavLink to="/" end className={({ isActive }) => `cmc-nav-link${isActive ? ' is-active' : ''}`}>
              <FontAwesomeIcon className="nav-icon" icon={faHouse} />
              <span className="nav-text">Trang chủ</span>
            </NavLink>

            <NavLink to="/tim-truyen" className={({ isActive }) => `cmc-nav-link${isActive ? ' is-active' : ''}`}>
              <FontAwesomeIcon className="nav-icon" icon={faMagnifyingGlass} />
              <span className="nav-text">Tìm truyện</span>
            </NavLink>

            <NavLink to="/bang-xep-hang" className={({ isActive }) => `cmc-nav-link${isActive ? ' is-active' : ''}`}>
              <FontAwesomeIcon className="nav-icon" icon={faRankingStar} />
              <span className="nav-text">Bảng xếp hạng</span>
            </NavLink>
          </nav>

          <div className="cmc-nav-actions">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-2">
                <span 
                  className="nav-crystal-balance" 
                  title={user?.role === 'Uploader' ? "Số dư Tinh thạch - Bấm để vào trang Rút tiền" : "Số dư Tinh thạch - Bấm để Nạp"}
                  onClick={() => {
                    if (user?.role === 'Uploader') {
                      navigate('/uploader/revenue');
                    } else {
                      setTopupOpen(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (user?.role === 'Uploader') {
                        navigate('/uploader/revenue');
                      } else {
                        setTopupOpen(true);
                      }
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faGem} />
                  <strong>{Number(user?.crystal_balance || 0)}</strong>
                </span>
                {(user?.role === 'Uploader' || user?.role === 'Admin' || Number(user?.crystal_earned || 0) > 0) ? (
                  <span 
                    className="nav-crystal-earned" 
                    title={`Tinh thạch kiếm được: ${Number(user?.crystal_earned || 0)} Tinh thạch (~${(Number(user?.crystal_earned || 0) * 500).toLocaleString('vi-VN')}đ) - Bấm để Rút tiền`}
                    onClick={() => navigate('/uploader/revenue')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/uploader/revenue');
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faGem} />
                    <strong>{Number(user?.crystal_earned || 0)}</strong>
                  </span>
                ) : null}
              </div>
            ) : null}
            <NotificationBell />
            <button
              type="button"
              className={`btn-theme-toggle ${isDarkMode ? 'is-light-target' : 'is-dark-target'}`}
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Bật sáng' : 'Bật tối'}
              aria-label={isDarkMode ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                <FontAwesomeIcon icon={isDarkMode ? faLightbulb : faMoon} />
              </span>
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
                      className="nav-profile-avatar"
                    />
                  ) : (
                    <div className="nav-profile-avatar nav-profile-avatar-fallback">
                      {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="nav-profile-copy">
                    <span className="nav-username">
                      {user?.full_name || user?.username}
                    </span>
                    <span className="nav-role">{user?.role}</span>
                  </span>
                  <FontAwesomeIcon className="nav-caret" icon={faChevronDown} />
                </button>

                {dropdownOpen && (
                  <div className="nav-profile-dropdown-menu">
                    <div className="nav-dropdown-header">
                      <div className="fw-semibold text-truncate">
                        {user?.full_name || user?.username}
                      </div>
                      <div className="small text-muted text-truncate">{user?.email}</div>
                      <span className="nav-dropdown-role">{user?.role}</span>
                    </div>

                    <Link
                      to="/account/following"
                      className="dropdown-item-cmc"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FontAwesomeIcon icon={faBookOpen} />
                      <span>Truyện đang theo dõi</span>
                    </Link>

                    {user?.role === 'Uploader' ? (
                      <Link
                        to="/uploader/revenue"
                        className="dropdown-item-cmc"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FontAwesomeIcon icon={faGem} />
                        <span>Rút Tinh thạch</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="dropdown-item-cmc"
                        onClick={() => {
                          setDropdownOpen(false);
                          setTopupOpen(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faGem} />
                        <span>Nạp Tinh thạch</span>
                      </button>
                    )}

                    <Link
                      to="/account/history"
                      className="dropdown-item-cmc"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FontAwesomeIcon icon={faClockRotateLeft} />
                      <span>Lịch sử đọc</span>
                    </Link>

                    <Link
                      to="/account/settings"
                      className="dropdown-item-cmc"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FontAwesomeIcon icon={faGear} />
                      <span>Cài đặt tài khoản</span>
                    </Link>
                    {user?.role === 'Uploader' && (
                      <Link
                        to="/dashboard"
                        className="dropdown-item-cmc"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FontAwesomeIcon icon={faPenNib} />
                        <span>Quản lý truyện</span>
                      </Link>
                    )}

                    {user?.role === 'Admin' && (
                      <Link
                        to="/admin"
                        className="dropdown-item-cmc"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FontAwesomeIcon icon={faShieldHalved} />
                        <span>Hệ thống Admin</span>
                      </Link>
                    )}
                    {user?.role === 'Moderator' && (
                      <Link
                        to="/moderator/dashboard"
                        className="dropdown-item-cmc"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <FontAwesomeIcon icon={faShieldHalved} />
                        <span>Hệ thống Moderator</span>
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
                      <FontAwesomeIcon icon={faRightFromBracket} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" className="btn-cmc btn-cmc-primary btn-sm" onClick={() => setAuthOpen(true)}>
                <FontAwesomeIcon icon={faUser} />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
    </>
  );
}

export default Navbar;
