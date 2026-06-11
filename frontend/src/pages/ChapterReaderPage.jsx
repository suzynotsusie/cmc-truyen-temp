import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import AIChapterSummary from '../components/AIChapterSummary';
import ReadingScrollProgress from '../components/ReadingScrollProgress';
import CommentSection from '../components/CommentSection';
import ReadingProgress from '../components/ReadingProgress';
import StoryReader, { loadReaderPrefs } from '../components/StoryReader';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { mockChapter } from '../data/mockStories';

const AUTOSAVE_INTERVAL_MS = 30000;

function ChapterReaderPage() {
  const { storyId, chapterId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [storyProgress, setStoryProgress] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [fontSize, setFontSize] = useState(18);
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [autoBookmark, setAutoBookmark] = useState(true);
  const REPORT_REASONS = [
    { value: 'inappropriate', label: 'Nội dung không phù hợp' },
    { value: 'copyright', label: 'Xâm phạm bản quyền' },
    { value: 'spam', label: 'Spam / quảng cáo' },
    { value: 'broken', label: 'Chương bị lỗi / thiếu nội dung' },
    { value: 'other', label: 'Khác' },
  ];
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportNote, setReportNote] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  
  const readTimeRef = useRef(0);
  const scrollRef = useRef(0);
  const hasInitialSavedRef = useRef(false);

  const chapterNumericId = useMemo(() => chapter?.id || chapterId, [chapter, chapterId]);

  useEffect(() => {
    const prefs = loadReaderPrefs();
    if (prefs) {
      if (prefs.fontSize) setFontSize(prefs.fontSize);
      if (prefs.lineSpacing) setLineSpacing(prefs.lineSpacing);
      if (prefs.fontFamily) setFontFamily(prefs.fontFamily);
    }
    hasInitialSavedRef.current = false;
  }, [chapterId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [chapterResponse, chaptersResponse] = await Promise.all([
          API.chapters.getById(storyId, chapterId),
          API.chapters.getByStory(storyId, 1, 100),
        ]);
        setChapter(chapterResponse.chapter || chapterResponse);
        setChapters(chaptersResponse.chapters || []);
      } catch {
        setChapter(mockChapter);
        setChapters([]);
        setError('Không tải được chương từ máy chủ. Đang hiển thị chương mô phỏng.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [storyId, chapterId]);

  useEffect(() => {
    if (!isAuthenticated) return;

    API.preferences.get()
      .then((res) => {
        const p = res.preferences;
        if (!p) return;
        setAutoBookmark(p.auto_bookmark !== false);
        if (p.font_size) setFontSize(p.font_size);
        if (p.line_spacing) setLineSpacing(Number(p.line_spacing));
        if (p.font_family) setFontFamily(p.font_family);
      })
      .catch(() => {});

    API.readingHistory.getStoryProgress(storyId)
      .then((res) => setStoryProgress(res.progress || null))
      .catch(() => setStoryProgress(null));
  }, [isAuthenticated, storyId]);

  const openReportModal = () => {
    setIsReportModalOpen(true);
    setReportReason(REPORT_REASONS[0].value);
    setReportNote('');
    setReportError('');
    setReportStatus('');
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setReportReason(REPORT_REASONS[0].value);
    setReportNote('');
    setReportError('');
    setReportStatus('');
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    if (reportStatus) {
      closeReportModal();
      return;
    }

    setReportError('');

    if (!isAuthenticated) {
      setReportError('Vui lòng đăng nhập để gửi báo cáo chương.');
      return;
    }

    if (!reportReason) {
      setReportError('Vui lòng chọn lý do báo cáo.');
      return;
    }

    try {
      await API.chapters.report(storyId, chapter.id, {
        reason: reportReason,
        note: reportNote.trim(),
        chapter_number: chapter.chapter_number,
      });
      setReportStatus('Báo cáo đã được gửi. Cảm ơn bạn đã góp ý.');
    } catch (error) {
      setReportError('Không thể gửi báo cáo. Vui lòng thử lại sau.');
    }
  };

  const saveProgress = useCallback(async () => {
    if (!isAuthenticated || !chapter) return;

    const resolvedChapterId = Number(chapter.id || chapterId);
    if (!resolvedChapterId || !Number.isFinite(resolvedChapterId)) return;

    try {
      const response = await API.readingHistory.save({
        story_id: Number(storyId),
        chapter_id: resolvedChapterId,
        read_position: Number.isFinite(scrollRef.current) ? Math.round(scrollRef.current) : 0,
        read_time: Number.isFinite(readTimeRef.current) ? Math.round(readTimeRef.current) : 0,
      });
      setStoryProgress(response.progress || null);
      readTimeRef.current = 0;
    } catch {
      // silent
    }
  }, [isAuthenticated, chapter, storyId, chapterId]);

  useEffect(() => {
    if (!isAuthenticated || !chapter || !autoBookmark) return;
    if (hasInitialSavedRef.current) return;

    const timer = setTimeout(() => {
      hasInitialSavedRef.current = true;
      saveProgress();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, chapter?.id, autoBookmark, saveProgress]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const onScroll = () => {
      scrollRef.current = Math.round(window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const tick = setInterval(() => {
      readTimeRef.current += 1;
    }, 1000);

    const autosave = setInterval(() => {
      saveProgress();
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(tick);
      clearInterval(autosave);
      saveProgress();
    };
  }, [isAuthenticated, saveProgress]);

  const chapterIndex = useMemo(
    () => chapters.findIndex((c) => String(c.id) === String(chapter?.id)),
    [chapters, chapter]
  );

  const goToChapter = (targetId) => {
    navigate(`/story/${storyId}/chapter/${targetId}`);
  };

  const handlePrevious = () => {
    if (chapterIndex > 0) {
      goToChapter(chapters[chapterIndex - 1].id);
      return;
    }
    const num = Number(chapter?.chapter_number || 1);
    if (num > 1) {
      navigate(`/story/${storyId}/chapter/${num - 1}`);
    }
  };

  const handleNext = () => {
    if (chapterIndex >= 0 && chapterIndex < chapters.length - 1) {
      goToChapter(chapters[chapterIndex + 1].id);
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, chapters, chapter]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (loading) {
    return (
      <main className="cmc-main animate-pulse">
        <div className="reader-top-bar mb-4">
          <div className="skeleton-box" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
          <div className="skeleton-box" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
        </div>
        <div className="panel-card p-4 p-lg-5" style={{ background: 'var(--surface)', borderRadius: '16px' }}>
          <div className="skeleton-box mb-3" style={{ height: '30px', width: '40%', borderRadius: '6px' }} />
          <div className="skeleton-box mb-4" style={{ height: '20px', width: '25%', borderRadius: '6px' }} />
          <hr />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '100%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '95%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '98%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '90%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '92%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '85%', borderRadius: '4px' }} />
        </div>
      </main>
    );
  }

  if (!chapter) {
    return (
      <main className="cmc-main">
        <p>Không tìm thấy chương.</p>
      </main>
    );
  }

  return (
    <main className="cmc-main">
      <ReadingScrollProgress />
      <div className="reader-top-bar d-flex align-items-center justify-content-between p-3 rounded-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <Link to={`/story/${storyId}`} className="btn-cmc btn-cmc-outline btn-sm d-inline-flex align-items-center gap-1">
            <span>←</span> <span className="d-none d-sm-inline">Về truyện</span>
          </Link>
        </div>
        <div style={{ flex: 2, textAlign: 'center' }}>
          <h5 className="mb-0 text-truncate" style={{ fontSize: '1rem', fontWeight: 'bold' }}>{chapter.story_title || 'CMC Truyện'}</h5>
          <span className="small text-muted text-truncate d-block">Chương {chapter.chapter_number}: {chapter.title}</span>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }} className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn-cmc btn-cmc-outline btn-sm"
            onClick={openReportModal}
          >
            Báo cáo
          </button>
          <button
            type="button"
            className="btn-cmc btn-cmc-outline btn-sm"
            onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => alert('Đã sao chép liên kết vào bộ nhớ tạm!'))}
          >
            Chia sẻ
          </button>
        </div>
      </div>

      {error ? <div className="alert-cmc alert-cmc-warning">{error}</div> : null}

      {isAuthenticated && storyProgress ? (
        <ReadingProgress progress={storyProgress} storyId={storyId} />
      ) : null}

      <StoryReader
        chapter={chapter}
        chapters={chapters}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onChapterSelect={goToChapter}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineSpacing={lineSpacing}
        setLineSpacing={setLineSpacing}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
      />

      {/* Chapter Navigation Grid */}
      {chapters.length > 0 && (
        <div className="panel-card mt-4">
          <h5 className="panel-title" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Chọn chương nhanh</h5>
          <div className="chapter-nav-grid d-flex flex-wrap gap-2">
            {chapters.slice(0, 30).map((ch) => {
              const isActive = String(ch.id) === String(chapter.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  className={`btn btn-sm ${isActive ? 'btn-brand' : 'btn-cmc-outline'}`}
                  style={{ minWidth: '55px', borderRadius: '8px' }}
                  onClick={() => goToChapter(ch.id)}
                >
                  Ch. {ch.chapter_number}
                </button>
              );
            })}
            {chapters.length > 30 && (
              <span className="align-self-center small text-muted ms-2">
                và {chapters.length - 30} chương khác...
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <AIChapterSummary chapterId={chapterNumericId} />
      </div>

      <div className="mt-4">
        <CommentSection
          key={`chapter-comments-${storyId}-${chapterNumericId}`}
          storyId={storyId}
          chapterId={chapterNumericId}
          mode="chapter"
        />
      </div>

      {isReportModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeReportModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-modal" onClick={closeReportModal} aria-label="Đóng">&times;</button>
            <h2>Báo cáo chương</h2>
            <p className="text-muted mb-3">Chương {chapter.chapter_number}: {chapter.title}</p>
            <form onSubmit={handleReportSubmit}>
              <div className="form-group-cmc">
                <label htmlFor="reportReason" className="d-block mb-2">Lý do báo cáo</label>
                <select
                  id="reportReason"
                  className="form-select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-cmc">
                <label htmlFor="reportNote" className="d-block mb-2">Ghi chú chi tiết</label>
                <textarea
                  id="reportNote"
                  className="form-control"
                  rows="4"
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Mô tả thêm chi tiết về vấn đề..."
                  disabled={Boolean(reportStatus)}
                />
              </div>

              {reportError ? <div className="alert-cmc alert-cmc-warning">{reportError}</div> : null}
              {reportStatus ? <div className="alert-cmc">{reportStatus}</div> : null}

              <div className="d-flex justify-content-end gap-2 mt-3">
                <button type="button" className="btn-cmc btn-cmc-outline" onClick={closeReportModal}>
                  Hủy
                </button>
                <button type="submit" className="btn-cmc btn-cmc-primary">
                  {reportStatus ? 'Đóng' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default ChapterReaderPage;
