import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

function AdminPayoutsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await API.payouts.getAllAdmin();
      setRequests(res.requests || res.data?.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcess = async (id, action) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ${action === 'approve' ? 'DUYỆT (Đã chuyển khoản thanh toán)' : 'TỪ CHỐI (Hoàn lại Tinh thạch)'} yêu cầu này?`)) return;

    setProcessingId(id);
    try {
      await API.payouts.processAdmin(id, action);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <section className="management-page">
      <header className="management-page-header">
        <div>
          <p className="management-eyebrow">TÀI CHÍNH</p>
          <h2>Quản lý Rút tiền</h2>
          <p>Duyệt các yêu cầu rút doanh thu của tác giả (Uploader).</p>
        </div>
        <button type="button" onClick={fetchRequests} disabled={loading}>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <div className="management-stats-grid compact">
        <article className="management-stat">
          <span>Tổng yêu cầu</span>
          <strong>{requests.length}</strong>
        </article>
        <article className="management-stat stat-active">
          <span>Chờ duyệt</span>
          <strong>{pendingCount}</strong>
        </article>
      </div>

      <section className="management-data-panel">
        {loading ? (
          <div className="management-loading">Đang tải danh sách yêu cầu...</div>
        ) : (
          <div className="management-table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Uploader</th>
                  <th>Số Tinh thạch</th>
                  <th>Thực nhận (VNĐ)</th>
                  <th>Ngân hàng</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>
                    <td>
                      <strong>{req.username}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--cmc-text-secondary)' }}>{req.email}</div>
                    </td>
                    <td>
                      <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" style={{color: 'var(--cmc-primary)'}}/> 
                      {Number(req.crystal_amount).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--cmc-success)', fontWeight: 'bold' }}>
                      {Number(req.vnd_amount).toLocaleString()}đ
                    </td>
                    <td>
                      <div>{req.bank_name}</div>
                      <strong>{req.account_number}</strong>
                      <div style={{ fontSize: '0.85rem' }}>{req.account_holder}</div>
                    </td>
                    <td>
                      <span className={`management-badge ${req.status === 'PENDING' ? 'warning' : req.status === 'COMPLETED' ? 'success' : 'danger'}`}>
                        {req.status === 'PENDING' ? 'Chờ duyệt' : req.status === 'COMPLETED' ? 'Đã thanh toán' : 'Từ chối'}
                      </span>
                    </td>
                    <td>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="primary-action"
                            style={{ background: 'var(--cmc-success)', borderColor: 'var(--cmc-success)', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleProcess(req.id, 'approve')}
                            disabled={processingId === req.id}
                            title="Duyệt"
                          >
                            <FontAwesomeIcon icon={faCheck} /> Duyệt
                          </button>
                          <button
                            type="button"
                            className="danger-outline"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleProcess(req.id, 'reject')}
                            disabled={processingId === req.id}
                            title="Từ chối"
                          >
                            <FontAwesomeIcon icon={faTimes} /> Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--cmc-text-tertiary)', fontSize: '0.9rem' }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!requests.length && (
                  <tr>
                    <td colSpan="7" className="management-empty-cell">Không có yêu cầu rút tiền nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default AdminPayoutsPage;
