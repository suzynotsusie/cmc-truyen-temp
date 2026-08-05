import {
  faBan,
  faBookOpen,
  faComments,
  faClockRotateLeft,
  faFlag,
  faGaugeHigh,
  faMoneyBillWave,
  faUsers,
  faUser,
} from '../lib/icons';
import ManagementLayoutShell from './ManagementLayoutShell';

const ADMIN_NAV_ITEMS = [
  { to: '/admin', end: true, label: 'Tổng quan hệ thống', icon: faGaugeHigh },
  { to: '/admin/users', label: 'Quản lý người dùng', icon: faUsers },
  { to: '/admin/stories', label: 'Quản lý truyện', icon: faBookOpen },
  { to: '/admin/payouts', label: 'Quản lý rút tiền', icon: faMoneyBillWave },
  { to: '/admin/reports', label: 'Quản lý báo cáo', icon: faFlag },
  { to: '/admin/comments', label: 'Quản lý bình luận', icon: faComments },
  { to: '/admin/profiles', label: 'Quản lý profile', icon: faUser },
  { to: '/admin/bad-words', label: 'Quản lý từ khóa', icon: faBan },
  { to: '/admin/logs', label: 'Nhật ký hoạt động', icon: faClockRotateLeft },
];

function AdminLayout() {
  return (
    <ManagementLayoutShell
      brand="Admin Console"
      roleLabel="Quản trị viên"
      navItems={ADMIN_NAV_ITEMS}
      accent="blue"
    />
  );
}

export default AdminLayout;
