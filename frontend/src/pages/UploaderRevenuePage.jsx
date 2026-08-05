import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGem, 
  faMoneyBillWave, 
  faHistory, 
  faClock, 
  faCheckCircle, 
  faTimesCircle,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import './UploaderRevenuePage.css';

const MIN_CRYSTAL_PAYOUT = 100;
const CRYSTAL_TO_VND_RATE = 500;

function UploaderRevenuePage() {
  const { user, refreshCurrentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [formData, setFormData] = useState({
    crystalAmount: MIN_CRYSTAL_PAYOUT,
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });

  const fetchRequests = async () => {
    try {
      const res = await API.payouts.getMyRequests();
      setRequests(res.requests || res.data?.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCurrentUser();
    fetchRequests();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await API.payouts.request(formData);
      setSuccess('Yêu cầu rút tiền đã được tạo thành công! Quản trị viên sẽ kiểm tra và thanh toán.');
      setFormData({
        ...formData,
        crystalAmount: MIN_CRYSTAL_PAYOUT
      });
      refreshCurrentUser();
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="status-badge warning"><FontAwesomeIcon icon={faClock} /> Chờ duyệt</span>;
      case 'COMPLETED':
        return <span className="status-badge success"><FontAwesomeIcon icon={faCheckCircle} /> Đã thanh toán</span>;
      case 'REJECTED':
        return <span className="status-badge danger"><FontAwesomeIcon icon={faTimesCircle} /> Từ chối</span>;
      default:
        return <span className="status-badge secondary">{status}</span>;
    }
  };

  const currentEarned = Number(user?.crystal_earned || 0);

  return (
    <main className="cmc-main account-area uploader-revenue-page-container">
      <header className="account-page-heading mb-4">
        <div>
          <span className="account-page-heading__eyebrow">Tài chính &amp; Doanh thu</span>
          <h1>Rút tiền doanh thu</h1>
          <p>Đổi Tinh thạch tích lũy từ lượt xem chương trả phí thành VNĐ (500đ / Tinh thạch).</p>
        </div>
        <button
          type="button"
          className="btn-cmc btn-cmc-outline history-trigger-btn ms-auto"
          onClick={() => setShowHistoryModal(true)}
        >
          <FontAwesomeIcon icon={faHistory} />
          Lịch sử rút tiền ({requests.length})
        </button>
      </header>

      <div className="revenue-single-card-wrap">
        <section className="panel-card revenue-main-card">
          {/* Revenue Balance Hero */}
          <div className="revenue-balance-hero">
            <div className="balance-hero-icon">
              <FontAwesomeIcon icon={faGem} />
            </div>
            <div className="balance-hero-details">
              <span className="balance-hero-label">Tinh thạch kiếm được khả dụng</span>
              <div className="balance-hero-value">
                <strong>{currentEarned.toLocaleString('vi-VN')}</strong>
                <span className="unit">Tinh thạch</span>
              </div>
              <p className="balance-hero-sub">
                Tương đương: <strong>{(currentEarned * CRYSTAL_TO_VND_RATE).toLocaleString('vi-VN')} VNĐ</strong>
              </p>
            </div>
          </div>

          <div className="cmc-divider my-4" />

          {/* Form Header */}
          <div className="revenue-form-heading mb-3">
            <h3>
              <FontAwesomeIcon icon={faMoneyBillWave} className="me-2 text-success" />
              Tạo yêu cầu rút tiền
            </h3>
            <p className="text-muted small">Nhập số Tinh thạch và thông tin tài khoản ngân hàng nhận tiền.</p>
          </div>

          {error ? <div className="alert-cmc alert-cmc-danger mb-3">{error}</div> : null}
          {success ? <div className="alert-cmc alert-cmc-success mb-3">{success}</div> : null}

          <form onSubmit={handleSubmit} className="revenue-form">
            <div className="form-group-cmc mb-3">
              <label className="form-label" htmlFor="crystalAmount">Số Tinh thạch muốn rút</label>
              <input
                id="crystalAmount"
                type="number"
                className="form-control-cmc"
                name="crystalAmount"
                min={MIN_CRYSTAL_PAYOUT}
                max={currentEarned > 0 ? currentEarned : MIN_CRYSTAL_PAYOUT}
                value={formData.crystalAmount}
                onChange={handleInputChange}
                required
              />
              <div className="form-hint-text mt-1">
                Tối thiểu: <strong>{MIN_CRYSTAL_PAYOUT} Tinh thạch (50.000 VNĐ)</strong> · Thực nhận: <strong className="text-success">{(Number(formData.crystalAmount || 0) * CRYSTAL_TO_VND_RATE).toLocaleString('vi-VN')} VNĐ</strong>
              </div>
            </div>

            <div className="form-group-cmc mb-3">
              <label className="form-label" htmlFor="bankName">Tên Ngân hàng</label>
              <input
                id="bankName"
                type="text"
                className="form-control-cmc"
                name="bankName"
                placeholder="VD: MB Bank, Vietcombank, Techcombank..."
                value={formData.bankName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group-cmc mb-3">
              <label className="form-label" htmlFor="accountNumber">Số tài khoản ngân hàng</label>
              <input
                id="accountNumber"
                type="text"
                className="form-control-cmc"
                name="accountNumber"
                placeholder="Nhập số tài khoản nhận tiền"
                value={formData.accountNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group-cmc mb-4">
              <label className="form-label" htmlFor="accountHolder">Tên chủ tài khoản</label>
              <input
                id="accountHolder"
                type="text"
                className="form-control-cmc"
                name="accountHolder"
                placeholder="Viết hoa không dấu (VD: NGUYEN VAN A)"
                value={formData.accountHolder}
                onChange={handleInputChange}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-cmc btn-cmc-primary btn-cmc-block w-100 py-3"
              disabled={submitting || currentEarned < MIN_CRYSTAL_PAYOUT || Number(formData.crystalAmount) > currentEarned}
            >
              {submitting ? 'Đang xử lý gửi...' : 'Gửi yêu cầu rút tiền'}
            </button>
          </form>
        </section>
      </div>

      {/* Modal Lịch sử rút tiền */}
      {showHistoryModal ? (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content panel-card history-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="m-0">
                <FontAwesomeIcon icon={faHistory} className="me-2 text-primary" />
                Lịch sử yêu cầu rút tiền
              </h3>
              <button 
                type="button" 
                className="btn-close-cmc"
                onClick={() => setShowHistoryModal(false)}
                aria-label="Đóng"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>

            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4 text-muted">Đang tải lịch sử...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-5 text-muted">Bạn chưa tạo yêu cầu rút tiền nào.</div>
              ) : (
                <div className="table-responsive">
                  <table className="management-table w-100">
                    <thead>
                      <tr>
                        <th>Mã YC</th>
                        <th>Số Tinh thạch</th>
                        <th>Thực nhận</th>
                        <th>Ngân hàng</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(req => (
                        <tr key={req.id}>
                          <td>#{req.id}</td>
                          <td>
                            <FontAwesomeIcon icon={faGem} className="text-success me-1" />
                            <strong>{Number(req.crystal_amount).toLocaleString('vi-VN')}</strong>
                          </td>
                          <td className="text-success fw-bold">
                            {Number(req.vnd_amount).toLocaleString('vi-VN')}đ
                          </td>
                          <td>
                            <div><strong>{req.bank_name}</strong></div>
                            <small className="text-muted">{req.account_number} ({req.account_holder})</small>
                          </td>
                          <td>{getStatusBadge(req.status)}</td>
                          <td><small className="text-muted">{new Date(req.created_at).toLocaleDateString('vi-VN')}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default UploaderRevenuePage;
