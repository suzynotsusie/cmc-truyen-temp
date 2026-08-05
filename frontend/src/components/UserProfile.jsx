import { FontAwesomeIcon, faPenNib } from '../lib/icons';

function UserProfile({ user, onEditClick }) {
  if (!user) {
    return null;
  }

  return (
    <section className="card border-0 shadow-sm user-profile-card">
      <div className="card-body p-4 p-lg-5 d-flex flex-column flex-md-row gap-4 align-items-md-center">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="rounded-circle flex-shrink-0"
            style={{ width: '80px', height: '80px', objectFit: 'cover', border: '3px solid var(--border)' }}
          />
        ) : (
          <div className="profile-avatar flex-shrink-0">
            {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-grow-1">
          <h3 className="mb-1">{user.full_name || user.username}</h3>
          <p className="text-muted mb-1">{user.email}</p>
          {user.bio ? (
            <p className="small text-muted mb-3" style={{ fontStyle: 'italic' }}>
              &quot;{user.bio}&quot;
            </p>
          ) : (
            <p className="small text-muted mb-3 text-opacity-50">Chưa có giới thiệu bản thân.</p>
          )}
          <div className="d-flex flex-wrap gap-2 align-items-center w-100">
            <span className="badge text-bg-primary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', padding: '0.35em 0.65em' }}>
              {user.role}
            </span>
            <span className="badge text-bg-warning" style={{ fontSize: '0.75rem', padding: '0.35em 0.65em' }}>
              💎 Số dư: {Number(user.crystal_balance || 0)} Tinh thạch
            </span>
            {user.role === 'Uploader' || user.role === 'Admin' || Number(user.crystal_earned || 0) > 0 ? (
              <span className="badge text-bg-success" style={{ fontSize: '0.75rem', padding: '0.35em 0.65em' }}>
                ✨ Kiếm được: {Number(user.crystal_earned || 0)} Tinh thạch (~{(Number(user.crystal_earned || 0) * 500).toLocaleString('vi-VN')}đ)
              </span>
            ) : null}
            {onEditClick ? (
              <button
                type="button"
                className="btn btn-cmc btn-cmc-outline btn-sm ms-md-auto"
                style={{ fontSize: '0.8rem', borderRadius: '8px', padding: '0.35rem 0.85rem' }}
                onClick={onEditClick}
              >
                <FontAwesomeIcon icon={faPenNib} />
                Chỉnh sửa hồ sơ
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default UserProfile;
