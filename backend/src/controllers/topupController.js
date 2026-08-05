let PayOS;
try {
  const payosPkg = require('@payos/node');
  PayOS = payosPkg.PayOS || payosPkg;
} catch (e) {
  PayOS = class {
    constructor() {}
    createPaymentLink() {
      throw new Error('PayOS module is not installed');
    }
    verifyPaymentWebhookData() {
      throw new Error('PayOS module is not installed');
    }
  };
}

// PayOS Initialization
// These should be configured in .env: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY
let payos;
try {
  payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || 'client-id',
    apiKey: process.env.PAYOS_API_KEY || 'api-key',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'checksum-key'
  });
} catch (e) {
  payos = null;
}

// Maps amount to crystal
function getCrystalForAmount(amount) {
  if (amount === 10000) return 20;
  if (amount === 20000) return 40;
  if (amount === 50000) return 110;
  if (amount === 100000) return 230;
  return Math.floor(amount / 500); // Default 1 TT = 500 VND
}

async function createTopupTransaction(req, res) {
  const client = await db.connect();
  try {
    const { amount, returnUrl, cancelUrl } = req.body;
    const userId = req.user.id;
    
    if (!amount || amount < 10000) {
      return res.status(400).json({ success: false, message: 'Amount must be at least 10000' });
    }

    const crystalReceived = getCrystalForAmount(amount);
    const orderCode = Number(String(Date.now()).slice(-9) + String(userId).padStart(3, '0'));
    const transferContent = `NAPTT${orderCode}`;

    const result = await client.query(
      `INSERT INTO topup_transactions (user_id, amount, crystal_received, transfer_content, order_code, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING id`,
      [userId, amount, crystalReceived, transferContent, orderCode]
    );

    const actualReturnUrl = returnUrl || `${req.protocol}://${req.get('host')}/account/settings`;
    const actualCancelUrl = cancelUrl || actualReturnUrl;

    const requestData = {
      orderCode,
      amount,
      description: transferContent.substring(0, 25),
      items: [
        {
          name: 'Nạp Tinh Thạch',
          quantity: 1,
          price: amount
        }
      ],
      returnUrl: actualReturnUrl,
      cancelUrl: actualCancelUrl
    };

    let checkoutUrl = null;
    let isSimulated = false;

    const isPayOSConfigured = 
      process.env.PAYOS_CLIENT_ID && 
      process.env.PAYOS_CLIENT_ID !== 'client-id' &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_API_KEY !== 'api-key';

    if (isPayOSConfigured && payos?.paymentRequests?.create) {
      try {
        const paymentLinkData = await payos.paymentRequests.create(requestData);
        checkoutUrl = paymentLinkData.checkoutUrl;
      } catch (payosErr) {
        console.warn('[Topup] PayOS API error, falling back to local simulation:', payosErr.message);
        isSimulated = true;
      }
    } else {
      isSimulated = true;
    }

    if (isSimulated) {
      await client.query('BEGIN');

      await client.query(
        `UPDATE topup_transactions SET status = 'SUCCESS', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [result.rows[0].id]
      );

      const userRes = await client.query(
        `UPDATE users SET crystal_balance = crystal_balance + $1 WHERE id = $2 RETURNING crystal_balance`,
        [crystalReceived, userId]
      );

      await client.query(
        `INSERT INTO crystal_transactions (user_id, type, amount, balance_after, description)
         VALUES ($1, 'TOPUP', $2, $3, $4)`,
        [userId, crystalReceived, userRes.rows[0].crystal_balance, `Nạp Tinh Thạch thử nghiệm: ${amount.toLocaleString('vi-VN')} VNĐ`]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: `Nạp Tinh Thạch thử nghiệm thành công! Bạn đã nhận ${crystalReceived} Tinh Thạch.`,
        data: {
          transactionId: result.rows[0].id,
          amount,
          crystalReceived,
          orderCode,
          newBalance: userRes.rows[0].crystal_balance,
          isSimulated: true
        }
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        transactionId: result.rows[0].id,
        amount,
        crystalReceived,
        orderCode,
        checkoutUrl
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[createTopupTransaction]', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
}

async function handleWebhook(req, res) {
  try {
    // Verify Webhook signature
    const webhookData = await payos.webhooks.verify(req.body);
    
    if (webhookData.code !== '00') { // 00 means successful transfer in webhook
      return res.json({ success: true });
    }

    const { orderCode, amount } = webhookData;

    if (!orderCode || !amount) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const txResult = await db.query(
      `SELECT * FROM topup_transactions WHERE order_code = $1 AND status = 'PENDING' LIMIT 1`,
      [orderCode]
    );

    if (txResult.rowCount === 0) {
      // Return 200 so PayOS stops retrying
      return res.status(200).json({ success: true, message: 'Transaction not found or already processed' });
    }

    const tx = txResult.rows[0];

    // Verify amount matches
    if (amount < tx.amount) {
      return res.status(400).json({ success: false, message: 'Amount mismatch' });
    }

    // Process transaction
    await db.query('BEGIN');

    // Update status
    await db.query(
      `UPDATE topup_transactions SET status = 'SUCCESS', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [tx.id]
    );

    // Update user balance
    const userResult = await db.query(
      `UPDATE users SET crystal_balance = crystal_balance + $1 WHERE id = $2 RETURNING crystal_balance`,
      [tx.crystal_received, tx.user_id]
    );

    // Record crystal_transactions
    await db.query(
      `INSERT INTO crystal_transactions (user_id, type, amount, balance_after, description)
       VALUES ($1, 'TOPUP', $2, $3, $4)`,
      [tx.user_id, tx.crystal_received, userResult.rows[0].crystal_balance, `Nạp tinh thạch qua PayOS: ${tx.amount} VND`]
    );

    await db.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Transaction processed successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[handleWebhook]', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  createTopupTransaction,
  handleWebhook
};
