import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGem, faQrcode, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './TopupModal.css';

const PACKAGES = [
  { amount: 10000, crystal: 20 },
  { amount: 20000, crystal: 40 },
  { amount: 50000, crystal: 110, bonus: 10 },
  { amount: 100000, crystal: 230, bonus: 30 }
];

function TopupModal({ open, onClose }) {
  const { refreshCurrentUser } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedPackage(null);
      setQrData(null);
      setError('');
      setSuccessMsg('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setQrData(null);
    setError('');
    setSuccessMsg('');
  };

  const handleGenerateQR = async () => {
    if (!selectedPackage) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const returnUrl = window.location.origin + window.location.pathname;
      const { data } = await apiClient.post('/topup/create', { 
        amount: selectedPackage.amount,
        returnUrl: returnUrl,
        cancelUrl: returnUrl
      });

      if (data.success) {
        if (data.data?.checkoutUrl) {
          window.location.href = data.data.checkoutUrl;
        } else if (data.data?.isSimulated) {
          setSuccessMsg(data.message || `Nạp ${selectedPackage.crystal} Tinh thạch thành công!`);
          if (refreshCurrentUser) refreshCurrentUser();
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        setError(data.message || 'Lỗi khi tạo mã thanh toán.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !qrData) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="modal-content topup-modal-content">
        <button type="button" className="close-modal" onClick={onClose} aria-label="Đóng">
          &times;
        </button>

        <h2 className="topup-header">
          <FontAwesomeIcon icon={faGem} />
          Nạp Tinh Thạch
        </h2>

        {error && (
          <div className="alert-cmc alert-cmc-warning mb-3">
            <FontAwesomeIcon icon={faExclamationCircle} className="me-2" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="alert-cmc alert-cmc-success mb-3">
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            {successMsg}
          </div>
        )}

        <p className="text-muted mb-4" style={{ textAlign: 'center' }}>Chọn gói tinh thạch bạn muốn nạp:</p>
        <div className="topup-grid">
          {PACKAGES.map((pkg, idx) => (
            <div
              key={idx}
              className={`topup-package-card ${selectedPackage?.amount === pkg.amount ? 'selected' : ''}`}
              onClick={() => handleSelectPackage(pkg)}
            >
              {pkg.bonus && <div className="bonus-badge">Tặng {pkg.bonus} TT</div>}
              <div className="crystal-amount">
                <FontAwesomeIcon icon={faGem} />
                {pkg.crystal}
              </div>
              <div className="vnd-amount">{pkg.amount.toLocaleString()} VNĐ</div>
            </div>
          ))}
        </div>
        
        <button
          type="button"
          className="btn-topup-action"
          disabled={!selectedPackage || loading}
          onClick={handleGenerateQR}
        >
          {loading ? 'Đang xử lý...' : 'Thanh toán qua PayOS'}
        </button>
      </div>
    </div>
  );
}

export default TopupModal;
