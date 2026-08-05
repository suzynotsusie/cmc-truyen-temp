const db = require('../config/database');

const MIN_CRYSTAL_PAYOUT = 100;
const CRYSTAL_TO_VND_RATE = 500; // 500 VNĐ per crystal

async function requestPayout(req, res) {
  const client = await db.connect();
  try {
    const userId = req.user.id;
    const { crystalAmount, bankName, accountNumber, accountHolder } = req.body;
    const amount = Number(crystalAmount);

    if (!amount || amount < MIN_CRYSTAL_PAYOUT) {
      return res.status(400).json({ 
        success: false, 
        message: `Số lượng rút tối thiểu là ${MIN_CRYSTAL_PAYOUT} Tinh thạch.` 
      });
    }

    if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin ngân hàng (Tên ngân hàng, Số tài khoản, Chủ tài khoản).' });
    }

    await client.query('BEGIN');

    // Check user's crystal_earned balance with lock
    const userResult = await client.query('SELECT crystal_earned FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const balance = Number(userResult.rows[0]?.crystal_earned || 0);

    if (amount > balance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Số dư Tinh thạch kiếm được không đủ.' });
    }

    // Hold crystal_earned immediately upon creating request
    await client.query('UPDATE users SET crystal_earned = crystal_earned - $1 WHERE id = $2', [amount, userId]);

    // Create payout request
    const vndAmount = amount * CRYSTAL_TO_VND_RATE;
    
    const insertResult = await client.query(
      `INSERT INTO payout_requests (user_id, crystal_amount, vnd_amount, bank_name, account_number, account_holder, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING *`,
      [userId, amount, vndAmount, bankName.trim(), accountNumber.trim(), accountHolder.trim()]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Yêu cầu rút tiền đã được gửi. Quản trị viên sẽ kiểm tra và chuyển khoản xử lý.',
      request: insertResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[payoutController.requestPayout]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo yêu cầu rút tiền.' });
  } finally {
    client.release();
  }
}

async function getMyPayouts(req, res) {
  try {
    const userId = req.user.id;
    const result = await db.query(
      'SELECT * FROM payout_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('[payoutController.getMyPayouts]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tải lịch sử rút tiền.' });
  }
}

async function getAllPayoutsAdmin(req, res) {
  try {
    const result = await db.query(`
      SELECT p.*, u.username, u.email, u.full_name
      FROM payout_requests p
      JOIN users u ON u.id = p.user_id
      ORDER BY 
        CASE WHEN p.status = 'PENDING' THEN 1 ELSE 2 END,
        p.created_at DESC
    `);
    return res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('[payoutController.getAllPayoutsAdmin]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tải danh sách lệnh rút tiền.' });
  }
}

async function processPayoutAdmin(req, res) {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    await client.query('BEGIN');

    const payoutResult = await client.query('SELECT * FROM payout_requests WHERE id = $1 FOR UPDATE', [id]);
    const payout = payoutResult.rows[0];

    if (!payout) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Yêu cầu rút tiền không tồn tại.' });
    }

    if (payout.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Yêu cầu này đã được xử lý trước đó.' });
    }

    if (action === 'approve') {
      // Mark as COMPLETED (paid)
      await client.query(
        'UPDATE payout_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['COMPLETED', id]
      );
    } else if (action === 'reject') {
      // Refund hold crystal_earned back to uploader
      await client.query(
        'UPDATE users SET crystal_earned = crystal_earned + $1 WHERE id = $2',
        [payout.crystal_amount, payout.user_id]
      );
      await client.query(
        'UPDATE payout_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['REJECTED', id]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ.' });
    }

    await client.query('COMMIT');
    return res.json({ 
      success: true, 
      message: action === 'approve' ? 'Đã duyệt thanh toán thành công.' : 'Đã từ chối và hoàn trả Tinh thạch cho Uploader.' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[payoutController.processPayoutAdmin]', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xử lý lệnh rút tiền.' });
  } finally {
    client.release();
  }
}

module.exports = {
  requestPayout,
  getMyPayouts,
  getAllPayoutsAdmin,
  processPayoutAdmin
};
