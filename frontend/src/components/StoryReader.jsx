import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon, faArrowLeft, faArrowRight, faCircleInfo, faLock, faGem } from '../lib/icons';
import { useAuth } from '../contexts/AuthContext';

const FONT_FAMILIES = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times' },
  { value: 'system-ui, sans-serif', label: 'System' },
];

const READER_PREFS_KEY = 'cmc_reader_prefs';

function loadReaderPrefs() {
  try {
    const raw = localStorage.getItem(READER_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveReaderPrefs(prefs) {
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function StoryReader({
  chapter,
  chapters = [],
  onPrevious,
  onNext,
  onChapterSelect,
  fontSize,
  setFontSize,
  lineSpacing,
  setLineSpacing,
  fontFamily,
  setFontFamily,
  autoUnlockNext,
  onAutoUnlockChange,
  navigationBusy = false,
  lockedChapter,
  unlocking = false,
  unlockError = '',
  onUnlock,
}) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const currentChapterNum = useMemo(
    () => Number(chapter?.chapter_number || lockedChapter?.chapter_number || 1),
    [chapter, lockedChapter]
  );

  const hasPrevious = useMemo(() => {
    return currentChapterNum > 1;
  }, [currentChapterNum]);

  const hasNext = useMemo(() => {
    if (chapters.length > 0) {
      const maxChapterNum = Math.max(...chapters.map((c) => Number(c.chapter_number || 0)));
      if (maxChapterNum > 0 && currentChapterNum >= maxChapterNum) {
        return false;
      }
    }
    return true;
  }, [currentChapterNum, chapters]);


  useEffect(() => {
    if (fontSize == null) {
      return;
    }
    saveReaderPrefs({ fontSize, lineSpacing, fontFamily });
  }, [fontSize, lineSpacing, fontFamily]);

  if (!chapter) {
    return null;
  }

  const storyDetailPath = chapter.story_id && chapter.story_slug
    ? `/story/${chapter.story_id}-${chapter.story_slug}`
    : null;

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <section className="story-reader reader-shell mx-auto px-2 px-sm-3 px-md-5 py-4" style={{ maxWidth: '1000px' }}>
      
      <div className="mb-4">
        <div className="reader-breadcrumb mb-3">
          <Link to="/" className="reader-link">Trang Chủ</Link>
          <span className="mx-2">/</span>
          {storyDetailPath ? (
            <Link to={storyDetailPath} className="reader-link">{chapter.story_title}</Link>
          ) : (
            <span className="reader-link">{chapter.story_title}</span>
          )}
          <span className="mx-2">/</span>
          <span className="reader-current">Chương {chapter.chapter_number}</span>
        </div>

        <h2 className="reader-title mb-2">
          {chapter.story_title} - Chương {chapter.chapter_number} 
          <span className="reader-updated ms-2">
            (Cập nhật lúc: {currentDate})
          </span>
        </h2>
      </div>

      <div 
        className="reader-keyboard-hint text-center py-3 mb-4 rounded" 
      >
        <i><FontAwesomeIcon className="me-2" icon={faCircleInfo} />Sử dụng mũi tên trái hoặc phải để chuyển chapter</i>
      </div>

      <div className="reader-nav-actions d-flex justify-content-center gap-2 mb-4">
        <button
          className="btn reader-nav-button px-4 py-2"
          onClick={onPrevious}
          disabled={!hasPrevious || navigationBusy}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Chap trước
        </button>
        <button
          className="btn reader-nav-button px-4 py-2"
          onClick={onNext}
          disabled={!hasNext || navigationBusy}
        >
          Chap sau <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      <div className="reader-toolbar rounded p-3 mb-4 d-flex flex-wrap gap-4 align-items-center justify-content-center">
        <label className="d-flex align-items-center gap-2 small mb-0">
          <input
            type="checkbox"
            checked={Boolean(autoUnlockNext)}
            onChange={(event) => onAutoUnlockChange?.(event.target.checked)}
          />
          <span>Tự động mở khóa chương tiếp theo (3 Tinh thạch)</span>
        </label>
        {chapters.length > 0 && onChapterSelect ? (
          <select
            className="form-select form-select-sm reader-select reader-chapter-select"
            value={chapter.id || ''}
            onChange={(e) => onChapterSelect(e.target.value)}
          >
            {chapter.id && !chapters.find(c => Number(c.id) === Number(chapter.id)) && (
              <option key={chapter.id} value={chapter.id}>
                Ch. {chapter.chapter_number}: {chapter.title}
              </option>
            )}
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                Ch. {item.chapter_number}: {item.title}
              </option>
            ))}
          </select>
        ) : null}

        <label className="d-flex align-items-center gap-2 small mb-0 reader-range-setting">
          <span className="reader-toolbar-label fw-medium">Cỡ chữ</span>
          <input
            type="range"
            min="14"
            max="28"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
          <span className="reader-range-value">{fontSize}px</span>
        </label>

        <label className="d-flex align-items-center gap-2 small mb-0 reader-range-setting">
          <span className="reader-toolbar-label fw-medium">Giãn dòng</span>
          <input
            type="range"
            min="1.2"
            max="2.4"
            step="0.1"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(Number(e.target.value))}
          />
          <span className="reader-range-value">{lineSpacing.toFixed(1)}</span>
        </label>

        <select
          className="form-select form-select-sm reader-select reader-font-select"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="reader-content-card panel-card mb-4">
        <div className={`reader-content-body p-3 p-sm-4 p-lg-5 ${chapter?.is_preview || lockedChapter ? 'chapter-preview-fade' : ''}`}>
          <div
            className="chapter-content reader-content"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineSpacing,
              fontFamily,
            }}
          >
            {chapter.content}
          </div>
        </div>
      </div>

      {(lockedChapter || chapter?.is_preview) ? (
        <div className="chapter-unlock-card">
          <div className="chapter-unlock-card-icon">
            <FontAwesomeIcon icon={faLock} />
          </div>
          <h3 className="chapter-unlock-card-title">Mở khóa ngay để đọc tiếp</h3>
          <p className="chapter-unlock-card-desc">
            <strong>Chương {lockedChapter?.chapter_number || chapter?.chapter_number}</strong> là chương trả phí.
            Dùng Tinh thạch để mở khóa toàn bộ nội dung chương này.
          </p>
          <div className="chapter-unlock-balance-pill">
            <span>
              <FontAwesomeIcon icon={faGem} className="chapter-unlock-gem-icon" />
              Giá: <strong>{lockedChapter?.unlock_cost || 3} Tinh thạch</strong>
            </span>
            <span className="chapter-unlock-divider" />
            <span>Số dư của bạn: <strong>{Number(user?.crystal_balance ?? lockedChapter?.crystal_balance ?? 0)} Tinh thạch</strong></span>
          </div>

          {unlockError ? <div className="alert-cmc alert-cmc-warning mb-3">{unlockError}</div> : null}

          <div className="chapter-unlock-btn-group">
            <button
              type="button"
              className="chapter-unlock-primary-btn"
              disabled={unlocking}
              onClick={onUnlock}
            >
              {unlocking ? 'Đang mở khóa...' : 'Mở khóa chương'}
            </button>

            {!isAuthenticated ? (
              <span
                className="chapter-unlock-secondary-link"
                onClick={() => navigate('/login')}
              >
                Đăng nhập để xem số dư và mở khóa
              </span>
            ) : Number(user?.crystal_balance ?? 0) < (lockedChapter?.unlock_cost || 3) ? (
              <span
                className="chapter-unlock-secondary-link text-danger"
                onClick={() => navigate('/user-profile')}
              >
                Bạn không đủ Tinh thạch. Nạp Tinh thạch ngay →
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="reader-nav-actions d-flex justify-content-center gap-2 mb-5">
        <button className="btn reader-nav-button px-4 py-2" onClick={onPrevious} disabled={!hasPrevious}><FontAwesomeIcon icon={faArrowLeft} /> Chap trước</button>
        <button className="btn reader-nav-button px-4 py-2" onClick={onNext} disabled={!hasNext}>Chap sau <FontAwesomeIcon icon={faArrowRight} /></button>
      </div>


      <div className="floating-reader-nav">
        <button
          className="btn reader-floating-button d-flex align-items-center justify-content-center"
          onClick={onPrevious}
          type="button"
          disabled={!hasPrevious || navigationBusy}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <select
          className="form-select reader-floating-select"
          value={chapter.id || ''}
          onChange={(e) => onChapterSelect(e.target.value)}
        >
          {chapter.id && !chapters.find(c => Number(c.id) === Number(chapter.id)) && (
            <option key={chapter.id} value={chapter.id}>
              Chương {chapter.chapter_number}
            </option>
          )}
          {chapters.map((item) => (
            <option key={item.id} value={item.id}>
              Chương {item.chapter_number}
            </option>
          ))}
        </select>

        <button
          className="btn reader-floating-button d-flex align-items-center justify-content-center"
          onClick={onNext}
          type="button"
          disabled={!hasNext || navigationBusy}
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

    </section>
  );
}

export { READER_PREFS_KEY, loadReaderPrefs, saveReaderPrefs };
export default StoryReader;
