import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useNavigationType } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGem } from '@fortawesome/free-solid-svg-icons';

import AIChapterSummary from '../components/AIChapterSummary';
import ReadingScrollProgress from '../components/ReadingScrollProgress';
import CommentSection from '../components/CommentSection';
import StoryReader, { loadReaderPrefs, saveReaderPrefs } from '../components/StoryReader';
import ReportModal from '../components/ReportModal';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AUTOSAVE_INTERVAL_MS = 30000;

function ChapterReaderPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { storySlug, chapterNumber } = useParams();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const { isAuthenticated, user, setCrystalBalance } = useAuth();
  
  const [fontSize, setFontSize] = useState(18);
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [autoBookmark, setAutoBookmark] = useState(true);
  const [autoUnlockNext, setAutoUnlockNext] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  
  const readTimeRef = useRef(0);
  const scrollRef = useRef(0);
  const hasInitialSavedRef = useRef(false);
  const hasInitialRestoreRef = useRef(false);
  const preferencesReadyRef = useRef(false);

  const { data: chapterData, isLoading: loading } = useQuery({
    queryKey: ['chapterData', storySlug, chapterNumber],
    queryFn: async () => {
      try {
        const chapterResponse = await API.chapters.getBySlugAndNumber(storySlug, chapterNumber);
        const resolvedChapter = chapterResponse.chapter || chapterResponse;

        const totalChapters = resolvedChapter.story_total_chapters || 100;
        const limit = Math.max(totalChapters, 10);
        const chaptersResponse = await API.chapters.getByStory(resolvedChapter.story_id, 1, limit);
        
        return {
          chapter: resolvedChapter,
          chapters: chaptersResponse.chapters || [],
          lockedChapter: null,
          error: '',
        };
      } catch (err) {
        if (err?.response?.data?.code === 'CHAPTER_LOCKED') {
          const locked = err.response.data.data;
          try {
            const response = await API.chapters.getByStory(locked.story_id, 1, 1000);
            return { chapter: null, chapters: response.chapters || [], lockedChapter: locked, error: '' };
          } catch {
            return { chapter: null, chapters: [], lockedChapter: locked, error: '' };
          }
        }
        
        if (err?.response?.status === 404) {
          return { chapter: null, chapters: [], lockedChapter: null, error: 'Chương truyện không tồn tại hoặc đã bị ẩn.' };
        }
        
        const { mockChapter } = await import('../data/mockStories');
        const fallback = { ...mockChapter };
        fallback.chapter_number = Number(chapterNumber);
        fallback.title = `Chương mẫu ${chapterNumber}`;
        const match = storySlug.match(/^(\d+)-(.*)$/);
        if (match) {
          fallback.story_id = Number(match[1]);
          fallback.story_slug = match[2];
        } else {
          fallback.story_slug = storySlug;
        }
        
        return {
          chapter: fallback,
          chapters: [
            { id: 101, chapter_number: 1, title: 'Chương mẫu 1' },
            { id: 102, chapter_number: 2, title: 'Chương mẫu 2' }
          ],
          lockedChapter: null,
          error: ''
        };
      }
    }
  });

  const chapter = chapterData?.chapter || null;
  const chapters = chapterData?.chapters || [];
  const lockedChapter = chapterData?.lockedChapter || null;
  const error = chapterData?.error || '';
  const chapterNumericId = useMemo(() => chapter?.id || null, [chapter]);

  useEffect(() => {
    preferencesReadyRef.current = false;
    const prefs = loadReaderPrefs();
    if (prefs) {
      if (prefs.fontSize) setFontSize(prefs.fontSize);
      if (prefs.lineSpacing) setLineSpacing(prefs.lineSpacing);
      if (prefs.fontFamily) setFontFamily(prefs.fontFamily);
    }
    hasInitialSavedRef.current = false;
    hasInitialRestoreRef.current = false;    
  }, [chapterNumber]);

  const loadChapterData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const chapterResponse = await API.chapters.getBySlugAndNumber(storySlug, chapterNumber);
      const resolvedChapter = chapterResponse.chapter || chapterResponse;
      setChapter(resolvedChapter);
      setLockedChapter(null);

      // Fetch all chapters for the dropdown (use story_total_chapters or a large limit)
      const totalChapters = resolvedChapter.story_total_chapters || 100;
      const limit = Math.max(totalChapters, 10); // At least 10, up to total
      const chaptersResponse = await API.chapters.getByStory(resolvedChapter.story_id, 1, limit);
      setChapters(chaptersResponse.chapters || []);
    } catch (err) {
      if (err?.response?.data?.code === 'CHAPTER_LOCKED') {
        const locked = err.response.data.data;
        const previewChapter = {
          id: locked.chapter_id,
          story_id: locked.story_id,
          chapter_number: locked.chapter_number,
          title: locked.title,
          content: locked.content || 'Nội dung chương này đang bị khóa...',
          story_title: locked.story_title,
          story_slug: locked.story_slug,
          is_paid: true,
          can_read: false,
          is_preview: true,
        };
        setChapter(previewChapter);
        setLockedChapter(locked);
        try {
          const response = await API.chapters.getByStory(locked.story_id, 1, 1000);
          setChapters(response.chapters || []);
        } catch {
          setChapters([]);
        }
        setError('');
        return;
      }
      setChapter(null);
      setLockedChapter(null);
      setChapters([]);
      if (err?.response?.status === 404) {
        setError('Chương truyện không tồn tại hoặc đã bị ẩn.');
      } else {
        setError('Không tải được chương từ máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  }, [storySlug, chapterNumber]);

  useEffect(() => {
    loadChapterData();
  }, [loadChapterData]);
  const [storyProgress, setStoryProgress] = useState(null);

  useEffect(() => {
    if (chapter && chapter.story_id && chapter.story_slug) {
      const canonicalStorySlug = `${chapter.story_id}-${chapter.story_slug}`;
      if (storySlug !== canonicalStorySlug) {
        navigate(`/${canonicalStorySlug}/${chapterNumber}`, { replace: true });
      }
    }
  }, [chapter, storySlug, chapterNumber, navigate]);

  useEffect(() => {
    saveReaderPrefs({ fontSize, lineSpacing, fontFamily });

    if (!isAuthenticated || !preferencesReadyRef.current) return undefined;

    const timer = window.setTimeout(() => {
      API.preferences.update({
        font_size: fontSize,
        line_spacing: lineSpacing,
        font_family: fontFamily,
      }).catch(() => {});
    }, 400);

    return () => window.clearTimeout(timer);
  }, [fontSize, lineSpacing, fontFamily, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !chapter?.story_id) return;

    // Load API preferences first for authenticated users (takes precedence)
    const loadPreferences = async () => {
      try {
        const res = await API.preferences.get();
        const p = res.preferences;
        if (p) {
          setAutoBookmark(p.auto_bookmark !== false);
          setAutoUnlockNext(Boolean(p.auto_unlock_next_chapter));
          if (p.font_size) setFontSize(p.font_size);
          if (p.line_spacing) setLineSpacing(Number(p.line_spacing));
          if (p.font_family) setFontFamily(p.font_family);
        }
      } catch {
        // Fall back to localStorage if API fails
        const prefs = loadReaderPrefs();
        if (prefs) {
          if (prefs.fontSize) setFontSize(prefs.fontSize);
          if (prefs.lineSpacing) setLineSpacing(prefs.lineSpacing);
          if (prefs.fontFamily) setFontFamily(prefs.fontFamily);
        }
      }
    };

    // Load story progress for scroll restoration
    const loadProgress = async () => {
      try {
        const res = await API.readingHistory.getStoryProgress(chapter.story_id);
        let progress = res.progress || null;
        
        // Check localStorage as fallback if progress just wasn't synced to DB yet
        if (!progress && chapter?.id) {
          const cachedScroll = localStorage.getItem(
            `chapter_scroll_${chapter.story_id}_${chapter.id}`
          );
          if (cachedScroll) {
            progress = {
              read_position: Number(cachedScroll),
              id: null, // temporary
            };
          }
        }
        
        setStoryProgress(progress);
      } catch {
        // Try localStorage as fallback on API error
        if (chapter?.id) {
          const cachedScroll = localStorage.getItem(
            `chapter_scroll_${chapter.story_id}_${chapter.id}`
          );
          if (cachedScroll) {
            setStoryProgress({
              read_position: Number(cachedScroll),
              id: null,
            });
          }
        }
      }
    };

    // Execute both in parallel. Chỉ bật đồng bộ sau khi cài đặt từ server đã tải xong,
    // tránh ghi đè server bằng giá trị mặc định lúc trang vừa mở.
    Promise.all([loadPreferences(), loadProgress()]).finally(() => {
      preferencesReadyRef.current = true;
    });
  }, [isAuthenticated, chapter?.story_id]);

  // Restore scroll position when chapter loads
  useEffect(() => {
    if (!storyProgress || loading) return; // Đợi load xong giao diện (chiều cao > 0)
    if (hasInitialRestoreRef.current) return; // Only restore once per chapter
    
    hasInitialRestoreRef.current = true;
    
    // Nếu là POP navigation (người dùng ấn Back/Forward), trình duyệt sẽ tự động
    // phục hồi scroll thông qua <ScrollRestoration>. KHÔNG can thiệp bằng Javascript!
    if (navType === 'POP') return;

    // Reset to top initially, then restore saved position after a small delay
    // to ensure DOM is fully rendered
    
    const timer = setTimeout(() => {
      const savedPosition = storyProgress.read_position || 0;
      if (savedPosition > 0 && window.scrollY === 0) {
        window.scrollTo(0, savedPosition);
        scrollRef.current = savedPosition;
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [storyProgress, chapterNumber, loading, navType]);

  const saveProgress = useCallback(async () => {
    if (!isAuthenticated || !chapter) return;

    const resolvedChapterId = Number(chapter.id);
    if (!resolvedChapterId || !Number.isFinite(resolvedChapterId)) return;

    try {
      const response = await API.readingHistory.save({
        story_id: Number(chapter.story_id),
        chapter_id: resolvedChapterId,
        read_position: Number.isFinite(scrollRef.current) ? Math.round(scrollRef.current) : 0,
        read_time: Number.isFinite(readTimeRef.current) ? Math.round(readTimeRef.current) : 0,
      });
      setStoryProgress(response.progress || null);
      readTimeRef.current = 0;
    } catch {
      // silent
    }
  }, [isAuthenticated, chapter]);

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

  // Save scroll position immediately when page is about to unload (F5, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAuthenticated && chapter) {
        const data = {
          story_id: Number(chapter.story_id),
          chapter_id: Number(chapter.id),
          read_position: Math.round(scrollRef.current),
          read_time: Math.round(readTimeRef.current),
        };
        
        // Use fetch with keepalive to save during unload
        try {
          const token = localStorage.getItem('cmc_token');
          fetch(
            `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')}/reading-history`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify(data),
              keepalive: true, // Keeps request alive during page unload
            }
          ).catch(() => {
            // Fallback to localStorage if API fails
            try {
              localStorage.setItem(
                `chapter_scroll_${chapter.story_id}_${chapter.id}`,
                String(scrollRef.current)
              );
            } catch {
              // silent
            }
          });
        } catch (err) {
          // Fallback to localStorage
          try {
            localStorage.setItem(
              `chapter_scroll_${chapter.story_id}_${chapter.id}`,
              String(scrollRef.current)
            );
          } catch {
            // silent
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAuthenticated, chapter]);

  const currentChapterNum = useMemo(
    () => Number(chapter?.chapter_number || lockedChapter?.chapter_number || chapterNumber || 1),
    [chapter, lockedChapter, chapterNumber]
  );

  const goToChapter = (targetChapterNumber) => {
    navigate(`/${storySlug}/${targetChapterNumber}`);
  };

  const unlockAndGo = async (target) => {
    const chapterIdToUnlock = lockedChapter?.chapter_id || chapter?.id || target?.chapter_id || target?.id;
    if (!chapterIdToUnlock) {
      setUnlockError('Không tìm thấy ID chương để mở khóa.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setUnlocking(true);
      setUnlockError('');
      const response = await API.chapters.unlock(chapterIdToUnlock);
      if (response?.crystal_balance !== undefined && typeof setCrystalBalance === 'function') {
        setCrystalBalance(response.crystal_balance);
      }

      // Mở khóa thành công -> Tự động nạp lại trang (F5) lập tức để hiển thị full truyện!
      window.location.reload();
    } catch (err) {
      console.error('[unlockAndGo error]', err?.response?.data || err);
      const errCode = err?.response?.data?.code;
      if (errCode === 'CHAPTER_ALREADY_UNLOCKED' || errCode === 'CHAPTER_ALREADY_FREE') {
        window.location.reload();
        return;
      }
      setUnlockError(err?.response?.data?.message || 'Không thể mở khóa chương.');
    } finally {
      setUnlocking(false);
    }
  };

  const requestChapterNavigation = (target) => {
    if (!target) return;
    goToChapter(target.chapter_number);
  };

  const handlePrevious = () => {
    if (currentChapterNum > 1) {
      goToChapter(currentChapterNum - 1);
    }
  };

  const handleNext = () => {
    goToChapter(currentChapterNum + 1);
  };

  const handleChapterSelect = (chapterId) => {
    const target = chapters.find((item) => String(item.id) === String(chapterId));
    if (target) {
      goToChapter(target.chapter_number);
    }
  };

  const handleAutoUnlockChange = async (enabled) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (
      enabled
      && !window.confirm('Khi bật, hệ thống sẽ tự động dùng 3 Tinh thạch để mở khóa chương trả phí tiếp theo mà không hỏi lại.')
    ) {
      return;
    }
    setAutoUnlockNext(enabled);
    try {
      await API.preferences.update({ auto_unlock_next_chapter: enabled });
    } catch {
      setAutoUnlockNext(!enabled);
      setUnlockError('Không thể lưu thiết lập tự động mở khóa.');
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
  }, [currentChapterNum, handlePrevious, handleNext]);

  if (loading) {
    return (
      <main className="cmc-main animate-pulse">
        <div className="panel-card p-4 p-lg-5" style={{ background: 'var(--surface)', borderRadius: '16px' }}>
          <div className="skeleton-box mb-3" style={{ height: '30px', width: '40%', borderRadius: '6px' }} />
          <div className="skeleton-box mb-4" style={{ height: '20px', width: '25%', borderRadius: '6px' }} />
          <hr />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '100%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '95%', borderRadius: '4px' }} />
          <div className="skeleton-box mb-3" style={{ height: '16px', width: '98%', borderRadius: '4px' }} />
        </div>
      </main>
    );
  }

  if (!chapter && lockedChapter) {
    const fallbackPreviewChapter = {
      id: lockedChapter.chapter_id || lockedChapter.id,
      story_id: lockedChapter.story_id,
      chapter_number: lockedChapter.chapter_number,
      title: lockedChapter.title,
      content: lockedChapter.content || 'Nội dung chương này đang bị khóa. Dùng Tinh thạch để mở khóa toàn bộ nội dung.',
      story_title: lockedChapter.story_title,
      story_slug: lockedChapter.story_slug,
      is_paid: true,
      can_read: false,
      is_preview: true,
    };
    return (
      <main className="cmc-main px-0 px-md-3">
        <StoryReader
          chapter={fallbackPreviewChapter}
          chapters={chapters}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onChapterSelect={handleChapterSelect}
          autoUnlockNext={autoUnlockNext}
          onAutoUnlockChange={handleAutoUnlockChange}
          navigationBusy={unlocking}
          fontSize={fontSize}
          setFontSize={setFontSize}
          lineSpacing={lineSpacing}
          setLineSpacing={setLineSpacing}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          lockedChapter={lockedChapter}
          unlocking={unlocking}
          unlockError={unlockError}
          onUnlock={() => unlockAndGo(lockedChapter)}
        />
      </main>
    );
  }

  if (!chapter) {
    return (
      <main className="cmc-main">
        {error ? (
          <div className="alert-cmc alert-cmc-warning">{error}</div>
        ) : (
          <p>Không tìm thấy chương.</p>
        )}
      </main>
    );
  }

  return (
    <main className="cmc-main px-0 px-md-3">
      <div className="container-fluid mb-2 d-flex justify-content-end px-0">
        <button className="btn btn-sm btn-outline-danger" onClick={() => setIsModalOpen(true)}>
          Báo cáo vi phạm
        </button>
      </div>

      {isModalOpen && (
        <ReportModal 
          storyId={chapter.story_id}
          chapterId={Number(chapter.id)} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      <ReadingScrollProgress />

      {error ? <div className="alert-cmc alert-cmc-warning">{error}</div> : null}
      {unlockError ? <div className="alert-cmc alert-cmc-warning">{unlockError}</div> : null}

      <StoryReader
        chapter={chapter}
        chapters={chapters}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onChapterSelect={handleChapterSelect}
        autoUnlockNext={autoUnlockNext}
        onAutoUnlockChange={handleAutoUnlockChange}
        navigationBusy={unlocking}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineSpacing={lineSpacing}
        setLineSpacing={setLineSpacing}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        lockedChapter={lockedChapter}
        unlocking={unlocking}
        unlockError={unlockError}
        onUnlock={() => unlockAndGo(lockedChapter)}
      />

      {/* --- PHỤC HỒI BẢNG CHỌN CHƯƠNG NHANH CÓ CĂN GIỮA --- */}
      {chapters.length > 0 && (
        <div className="panel-card mt-4 mx-auto" style={{ maxWidth: '1000px' }}>
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
                  onClick={() => requestChapterNavigation(
                    ch,
                    Number(ch.chapter_number) > Number(chapter.chapter_number)
                  )}
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

      <div className="mt-4 mx-auto" style={{ maxWidth: '1000px' }}>
        <AIChapterSummary chapterId={chapterNumericId} />
      </div>

      <div className="mt-4 mx-auto" style={{ maxWidth: '1000px' }}>
        <CommentSection
          key={`chapter-comments-${chapter.story_id}-${chapterNumericId}`}
          storyId={chapter.story_id}
          chapterId={chapterNumericId}
          mode="chapter"
        />
      </div>
    </main>
  );
}

export default ChapterReaderPage;
