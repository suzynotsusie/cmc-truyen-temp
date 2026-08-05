const db = require('../config/database');

// Chuỗi SELECT cơ bản dùng chung cho mọi query lấy thông tin user
// Không bao gồm các trường nhạy cảm như... thực ra password ở đây vẫn được select,
// nhưng sanitizeUser() ở controller sẽ loại bỏ trước khi trả về client
const baseSelect = `
  id,
  username,
  email,
  password,
  full_name,
  avatar_url,
  role,
  bio,
  created_at,
  updated_at,
  is_active,
  google_id,
  auth_provider,
  crystal_balance,
  crystal_earned
`;

/**
 * Tìm user theo email (dùng cho đăng nhập và kiểm tra email đã tồn tại).
 * LIMIT 1 đảm bảo chỉ lấy 1 kết quả dù email có bị trùng (không nên xảy ra vì có UNIQUE constraint).
 */
async function findByEmail(email) {
  const result = await db.query(`SELECT ${baseSelect} FROM users WHERE email = $1 LIMIT 1`, [email]);
  return result.rows[0] || null;
}

/**
 * Tìm user theo ID (dùng khi xác thực JWT để lấy thông tin mới nhất từ DB).
 */
async function findById(id) {
  const result = await db.query(`SELECT ${baseSelect} FROM users WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
}

/**
 * Tạo user mới trong database.
 * RETURNING ${baseSelect}: Trả về ngay thông tin user vừa tạo mà không cần query thêm.
 * fullName mặc định là null nếu không được cung cấp.
 */
async function createUser({ username, email, password, fullName, role = 'User' }) {
  const result = await db.query(
    `INSERT INTO users (username, email, password, full_name, role, crystal_balance, crystal_earned)
     VALUES ($1, $2, $3, $4, $5, 0, 0)
     RETURNING ${baseSelect}`,
    [username, email, password, fullName || null, role]
  );
  return result.rows[0];
}

/**
 * Lấy danh sách tất cả user (dùng cho trang quản trị admin).
 * Không select password để tránh lộ dữ liệu nhạy cảm trong danh sách.
 * Sắp xếp theo created_at DESC: user mới nhất hiển thị trước.
 *
 * @param {number} limit - Số user tối đa trả về (mặc định 100)
 */
async function findAll(limit = 100, search = '') {
  let query = `
    SELECT id, username, email, full_name, avatar_url, role, bio, created_at, is_active
    FROM users
  `;
  const params = [];

  if (search && search.trim() !== '') {
    const s = `%${search.trim()}%`;
    query += ` WHERE username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1`;
    params.push(s);
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $2`;
  } else {
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $1`;
  }

  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Cập nhật role của một user (chỉ Admin được thực hiện).
 * Cập nhật updated_at để tracking thay đổi.
 * RETURNING trả về thông tin user sau khi cập nhật mà không cần query thêm.
 */
async function updateRole(id, role) {
  const result = await db.query(
    `
      UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, full_name, role, is_active
    `,
    [role, id]
  );
  return result.rows[0] || null;
}

/**
 * Cập nhật thông tin profile của user (full_name, avatar_url, bio).
 * Dùng COALESCE($1, field): Chỉ cập nhật trường khi có giá trị mới gửi lên.
 * Nếu gửi null, giữ nguyên giá trị cũ (partial update).
 * Ví dụ: COALESCE(null, 'tên cũ') = 'tên cũ' → không bị ghi đè khi không gửi
 */
async function updateProfile(id, { full_name, avatar_url, bio }) {
  const result = await db.query(
    `
      UPDATE users 
      SET full_name = COALESCE($1, full_name), 
          avatar_url = COALESCE($2, avatar_url), 
          bio = COALESCE($3, bio), 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, username, email, full_name, avatar_url, role, bio, is_active
    `,
    [full_name || null, avatar_url || null, bio || null, id]
  );
  return result.rows[0] || null;
}

/**
 * Cập nhật trạng thái kích hoạt (khóa/mở khóa) của một user (chỉ Admin).
 */
async function updateActiveStatus(id, isActive) {
  const result = await db.query(
    `
      UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, full_name, role, is_active
    `,
    [isActive, id]
  );
  return result.rows[0] || null;
}

/**
 * Tìm user theo username (dùng để kiểm tra trùng lặp khi đăng ký).
 */
async function findByUsername(username) {
  const result = await db.query(`SELECT ${baseSelect} FROM users WHERE username = $1 LIMIT 1`, [username]);
  return result.rows[0] || null;
}

/**
 * Tìm user theo Google ID (dùng khi đăng nhập bằng Google).
 */
async function findByGoogleId(googleId) {
  const result = await db.query(
    `SELECT ${baseSelect} FROM users WHERE google_id = $1 LIMIT 1`,
    [googleId]
  );
  return result.rows[0] || null;
}

/**
 * Tạo user mới từ đăng ký Google.
 * auth_provider = 'google', lưu google_id và avatar_url từ Google.
 */
async function createGoogleUser({ googleId, email, password, fullName, avatarUrl, username }) {
  const result = await db.query(
    `INSERT INTO users (username, email, password, full_name, avatar_url, role, google_id, auth_provider, crystal_balance, crystal_earned)
     VALUES ($1, $2, $3, $4, $5, 'User', $6, 'google', 0, 0)
     RETURNING ${baseSelect}`,
    [username, email, password, fullName || null, avatarUrl || null, googleId]
  );
  return result.rows[0];
}

/**
 * Link google_id vào tài khoản đã có (user đăng ký thường trước, sau đó đăng nhập Google lần đầu).
 */
async function linkGoogleId(userId, googleId) {
  const result = await db.query(
    `
      UPDATE users SET google_id = $1, auth_provider = 'google', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING ${baseSelect}
    `,
    [googleId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Cập nhật mật khẩu của user (dùng cho forgot-password và change-password).
 * password phải đã được hash trước khi truyền vào.
 */
async function updatePassword(id, hashedPassword) {
  const result = await db.query(
    `
      UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email
    `,
    [hashedPassword, id]
  );
  return result.rows[0] || null;
}

/**
 * Lấy user kèm password hash — chỉ dùng nội bộ cho change-password.
 * Không dùng cho các endpoint trả dữ liệu về client.
 */
async function findByIdWithPassword(id) {
  const result = await db.query(
    `SELECT ${baseSelect} FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  findAll,
  updateRole,
  updateProfile,
  updateActiveStatus,
  findByUsername,
  findByGoogleId,
  createGoogleUser,
  linkGoogleId,
  updatePassword,
  findByIdWithPassword,
};
