import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AdminLayout() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h2>CMC Admin</h2>
        </div>

        <div className="admin-menu-wrapper">
          <nav className="admin-menu admin-menu-top">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                isActive
                  ? 'admin-menu-item active'
                  : 'admin-menu-item'
              }
            >
              📊 Dashboard
            </NavLink>

            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                isActive
                  ? 'admin-menu-item active'
                  : 'admin-menu-item'
              }
            >
              👥 Quản lý người dùng
            </NavLink>

            <NavLink
              to="/admin/stories"
              className={({ isActive }) =>
                isActive
                  ? 'admin-menu-item active'
                  : 'admin-menu-item'
              }
            >
              📚 Quản lý truyện
            </NavLink>
          </nav>

          <div className="admin-menu-bottom">
            <button
              type="button"
              className="admin-menu-item admin-logout-button"
              onClick={handleLogout}
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;