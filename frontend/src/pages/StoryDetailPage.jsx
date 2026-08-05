import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';

import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';
import ReportModal from '../components/ReportModal';
import StoryRating from '../components/StoryRating';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { mockStories } from '../data/mockStories';
import { slugify } from '../utils/slugify';
import {
  FontAwesomeIcon,
  faBookBookmark,
  faBookOpen,
  faChevronLeft,
  faChevronRight,
  faFlag,
  faForwardStep,
  faLock,
  faLockOpen,
  faStar,
  faXmark,
} from '../lib/icons';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80';

const CHAPTERS_PER_PAGE = 10;

function StoryDetailSkeleton() {
  return (
    <main className="cmc-main storyqq-page story-detail-skeleton" aria-busy="true">
      <div className="storyqq-page-shell">
        <section className="storyqq-header panel-card storyqq-panel">
          <div className="storyqq-cover-column">
            <div className="skeleton-box story-detail-skeleton-cover" />
            <div className="skeleton-box story-detail-skeleton-meta" />
          </div>
          <div className="storyqq-header-content story-detail-skeleton-content">
            <div className="skeleton-box story-detail-skeleton-title" />
            <div className="skeleton-box story-detail-skeleton-author" />
            <div className="skeleton-box story-detail-skeleton-line" />
            <div className="skeleton-box story-detail-skeleton-line" />
            <div className="skeleton-box story-detail-skeleton-line is-short" />
            <div className="story-detail-skeleton-actions">
              {[1, 2, 3].map((item) => <div key={item} className="skeleton-box" />)}
            </div>
          </div>
        </section>
        <section className="panel-card mt-4 storyqq-panel story-detail-skeleton-chapters">
          <div className="skeleton-box story-detail-skeleton-heading" />
          {[1, 2, 3, 4, 5].map((item) => <div key={item} className="skeleton-box story-detail-skeleton-chapter" />)}
        </section>
      </div>
    </main>
  );
}

function formatChapterUploadDate(createdAt) {
  if (!createdAt) return '--/--/----';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return '--/--/----';
  return parsed.toLocaleDateString('vi-VN');
}

function formatDateOrFallback(dateValue) {
  if (!dateValue) return 'Chưa cập nhật';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
  return parsed.toLocaleDateString('vi-VN');
}

function formatWholeNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatRatingWithCount(averageValue, countValue) {
  const rating = Number(averageValue || 0);
  const count = Number(countValue || 0);
  const ratingStr = rating.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const countStr = count.toLocaleString('vi-VN');
  return `${ratingStr}/5 (${countStr} lượt)`;
}

function StoryDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, setCrystalBalance } = useAuth();
  const [chapterPage, setChapterPage] = useState(1);
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('cmc_chapter_sort_order') || 'desc';
  });
  const [chapterSearch, setChapterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [introExpanded, setIntroExpanded] = useState(false);
  const [unlockingChapterId, setUnlockingChapterId] = useState(null);
  const debounceTimerRef = useRef(null);
  const hasAutoJumpedRef = useRef(false);

  const handleSortOrderChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    localStorage.setItem('cmc_chapter_sort_order', newSortOrder);
    setChapterPage(1);
  };



  // Debounce chapter search to avoid excessive API calls (#9)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(chapterSearch);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [chapterSearch]);

  // Load story info
  const { data: storyResponse, isLoading: loading } = useQuery({
    queryKey: ['story', slug],
    queryFn: async () => {
      try {
        const response = await API.stories.getBySlug(slug);
        return { story: response.story || response, isFallback: false, error: '' };
      } catch (err) {
        if (err?.response?.status === 404) {
          return { story: null, isFallback: false, error: 'Truyện không tồn tại hoặc đã bị ẩn.' };
        }
        const match = slug.match(/^(\d+)-(.*)$/);
        let fallbackStory;
        if (match) {
          fallbackStory = mockStories.find((item) => item.id === Number(match[1]));
        } else {
          fallbackStory = mockStories.find((item) => item.slug === slug);
        }
        return {
          story: fallbackStory || mockStories[0],
          isFallback: true,
          error: 'Không kết nối API. Hiển thị dữ liệu mẫu.',
        };
      }
    },
  });
  const story = storyResponse?.story || null;
  const error = storyResponse?.error || '';

  // Reset auto-jump flag when story changes
  useEffect(() => {
    hasAutoJumpedRef.current = false;
  }, [story?.id]);

  // Redirect to canonical URL (storyId-slug) if not already matching
  useEffect(() => {
    if (story && story.id && story.slug) {
      const canonicalSlug = `${story.id}-${story.slug}`;
      if (slug !== canonicalSlug) {
        navigate(`/story/${canonicalSlug}`, { replace: true });
      }
    }
  }, [story, slug, navigate]);

  // Load chapter metadata
  const isSearchingChapter = Boolean(debouncedSearch.trim());
  const pageToFetch = isSearchingChapter ? 1 : chapterPage;
  const limitToFetch = isSearchingChapter ? 1000 : CHAPTERS_PER_PAGE;

  const { data: chaptersResponse, isLoading: chapterLoading } = useQuery({
    queryKey: ['chapters', story?.id, pageToFetch, limitToFetch, sortOrder, debouncedSearch],
    queryFn: async () => {
      try {
        const res = await API.chapters.getByStory(story.id, pageToFetch, limitToFetch, sortOrder);
        return {
          chapters: res.chapters || [],
          pagination: res.pagination || { page: 1, totalPages: 1, totalItems: 0 },
        };
      } catch {
        return {
          chapters: [
            { id: 1, chapter_number: 1, title: 'Chương mẫu 1' },
            { id: 2, chapter_number: 2, title: 'Chương mẫu 2' },
          ],
          pagination: { page: 1, totalPages: 1, totalItems: 2 },
        };
      }
    },
    enabled: !!story?.id,
  });
  const chapters = chaptersResponse?.chapters || [];
  const chapterPagination = chaptersResponse?.pagination || { page: 1, totalPages: 1, totalItems: 0 };

  // Load reading progress
  const { data: readingStateResponse } = useQuery({
    queryKey: ['readingState', story?.id],
    queryFn: async () => {
      const [progressResult, readChaptersResult] = await Promise.allSettled([
        API.readingHistory.getStoryProgress(story.id),
        API.readingHistory.getReadChapters(story.id),
      ]);
      const progress = progressResult.status === 'fulfilled' ? progressResult.value?.progress || null : null;
      const readChapterList = readChaptersResult.status === 'fulfilled' ? readChaptersResult.value?.chapter_numbers || [] : [];
      
      const nextReadChapters = new Set(
        readChapterList
          .map((chapterNumber) => Number(chapterNumber))
          .filter((chapterNumber) => Number.isInteger(chapterNumber) && chapterNumber > 0),
      );

      if (nextReadChapters.size === 0 && progress?.chapter_number) {
        nextReadChapters.add(Number(progress.chapter_number));
      }
      return { progress, nextReadChapters };
    },
    enabled: !!story?.id && isAuthenticated,
  });
  const storyProgress = readingStateResponse?.progress || null;
  const readChapterNumbers = readingStateResponse?.nextReadChapters || new Set();

  // Auto-jump to the page containing the current reading progress on initial load
  useEffect(() => {
    if (!storyProgress?.chapter_number || !story?.id || hasAutoJumpedRef.current) return;

    const currentChapterNum = Number(storyProgress.chapter_number);
    if (!currentChapterNum || currentChapterNum <= 0) return;

    const totalChapters = story.chapter_count || story.total_chapters || chapterPagination.totalItems || 0;

    let targetPage = 1;
    if (sortOrder === 'asc') {
      targetPage = Math.ceil(currentChapterNum / CHAPTERS_PER_PAGE);
    } else if (totalChapters > 0) {
      const offsetFromLatest = totalChapters - currentChapterNum;
      if (offsetFromLatest >= 0) {
        targetPage = Math.floor(offsetFromLatest / CHAPTERS_PER_PAGE) + 1;
      }
    }

    if (targetPage > 1) {
      setChapterPage(targetPage);
    }
    hasAutoJumpedRef.current = true;
  }, [storyProgress, story?.id, sortOrder, chapterPagination.totalItems]);

  const saveScrollPosition = () => {
    sessionStorage.setItem(`scroll_pos_${window.location.pathname}`, window.scrollY.toString());
  };

  // Restore scroll position when returning to this story detail page
  useEffect(() => {
    if (loading || chapterLoading) return;
    const key = `scroll_pos_${window.location.pathname}`;
    const savedPos = sessionStorage.getItem(key);
    if (savedPos !== null) {
      const posY = Number(savedPos);
      sessionStorage.removeItem(key);
      requestAnimationFrame(() => {
        window.scrollTo({ top: posY, behavior: 'instant' });
      });
    }
  }, [loading, chapterLoading]);

  const filteredChapters = useMemo(() => {
    const keyword = chapterSearch.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return chapters;
    const numberKeyword = keyword.replace(/^(?:ch|chương)\.?\s*/u, '');

    return chapters.filter((chapter) => {
      const chapterNumber = String(chapter.chapter_number ?? '');
      const chapterTitle = String(chapter.title || '').toLocaleLowerCase('vi-VN');
      return chapterNumber.includes(numberKeyword) || chapterTitle.includes(keyword);
    });
  }, [chapters, chapterSearch]);

  const handleLockedChapterClick = async (event, chapter) => {
    if (unlockingChapterId) { event.preventDefault(); return; }
    if (chapter.can_read !== false) return;
    event.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const cost = chapter.unlock_cost || 2;
    if (!window.confirm(
      `Mở khóa chương ${chapter.chapter_number} với ${cost} Tinh thạch?\n`
      + `Số dư sau mở khóa: ${Number(user?.crystal_balance || 0) - cost}`
    )) return;

    try {
      setUnlockingChapterId(chapter.id);
      const response = await API.chapters.unlock(chapter.id);
      setCrystalBalance(response.crystal_balance);
      setChapters((current) => current.map((item) => (
        item.id === chapter.id ? { ...item, is_unlocked: true, can_read: true } : item
      )));
      navigate(`/${story.id}-${story.slug}/${chapter.chapter_number}`);
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Không thể mở khóa chương.');
    } finally {
      setUnlockingChapterId(null);
    }
  };

  if (loading) {
    return <StoryDetailSkeleton />;
  }

  if (!story) {
    return (
      <main className="cmc-main">
        {error ? (
          <div className="alert-cmc alert-cmc-warning">{error}</div>
        ) : (
          <p>Không tìm thấy truyện.</p>
        )}
      </main>
    );
  }

  const lastReadChapterNumber = Number(storyProgress?.chapter_number || 0);
  const totalChapters = story.chapter_count || story.total_chapters || chapterPagination.totalItems || 0;
  const firstChapterNumber = totalChapters > 0 ? 1 : null;
  const continueChapterNumber = storyProgress?.chapter_number || firstChapterNumber;
  const latestChapter = chapters.reduce((latest, chapter) => {
    if (!latest) return chapter;
    return Number(chapter.chapter_number || 0) > Number(latest.chapter_number || 0) ? chapter : latest;
  }, null);
  const storyCreatedDate = formatDateOrFallback(story.created_at || story.published_at || latestChapter?.created_at);
  const followCount = story.follow_count ?? story.follower_count ?? 0;
  const totalViews = story.total_views ?? story.view_count ?? story.views ?? story.views_metric ?? 0;
  const averageRating = story.average_rating ?? 0;
  const ratingCount = story.rating_count ?? story.total_rating_count ?? 0;
  const description = story.description || 'Chưa có mô tả cho truyện này.';
  const hasLongDescription = description.length > 320;
  const detailBackdropStyle = {
    '--storyqq-backdrop-image': `url('${story.cover_image_url || FALLBACK_COVER}')`,
  };

  const storyMetaItems = [
    { label: 'Số chương', value: formatWholeNumber(totalChapters) },
    { label: 'Người theo dõi', value: formatWholeNumber(followCount) },
    { label: 'Tổng lượt đọc', value: formatWholeNumber(totalViews) },
    { label: 'Đánh giá', value: formatRatingWithCount(averageRating, ratingCount) },
    { label: 'Ngày đăng', value: storyCreatedDate },
  ];

  return (
    <main className="cmc-main storyqq-page" style={detailBackdropStyle}>
      {error ? <div className="alert-cmc alert-cmc-warning">{error}</div> : null}



      <div className="storyqq-page-shell">
        <section className="storyqq-header panel-card storyqq-panel">
        <div className="storyqq-cover-column">
          <div className="storyqq-cover-wrap">
            <img
              src={story.cover_image_url || FALLBACK_COVER}
              alt={story.title}
              className="storyqq-cover"
              onError={(e) => { e.currentTarget.src = FALLBACK_COVER; }}
            />
            <span className="storyqq-status-badge">{story.status || 'Đang cập nhật'}</span>
          </div>

          <dl className="storyqq-meta-table">
            {storyMetaItems.map((item) => (
              <div key={item.label} className="storyqq-meta-item">
                <dt className="storyqq-meta-label">{item.label}</dt>
                <dd className="storyqq-meta-value">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="storyqq-header-content">
          <h1 className="storyqq-title">{story.title}</h1>

          <p className="storyqq-author">
            <span>Tác giả: {story.author_name || 'Không rõ tác giả'}</span>
            <span className="text-muted">
              {' · Người đăng: '}
              {story.author_full_name || (story.author_username ? `@${story.author_username}` : 'Không rõ')}
            </span>
            {story.collaborators?.length > 0 && (
              <>
                {' · Đồng đăng: '}
                <span className="text-muted">
                  {story.collaborators.map((c) => c.full_name || c.username).join(', ')}
                </span>
              </>
            )}
          </p>

          <div className="storyqq-intro-block">
            <p className="storyqq-intro-label">Giới thiệu truyện</p>
            <p className={`storyqq-desc${!introExpanded && hasLongDescription ? ' is-collapsed' : ''}`}>
              {description}
            </p>
            {hasLongDescription ? (
              <button
                type="button"
                className="storyqq-intro-toggle"
                onClick={() => setIntroExpanded((current) => !current)}
                aria-expanded={introExpanded}
              >
                {introExpanded ? 'Thu gọn' : 'Đọc thêm'}
              </button>
            ) : null}
          </div>

          <div className="storyqq-tags-footer">
            {story.tags?.length > 0 ? (
              <div className="story-tags-row">
                {story.tags.map((tag) => (
                  <Link key={tag.id} to={`/tim-truyen?tag=${tag.slug}`} className="story-tag-chip">
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : story.category ? (
              <div className="story-tags-row">
                <Link to={`/tim-truyen?tag=${slugify(story.category)}`} className="story-tag-chip">
                  {story.category}
                </Link>
              </div>
            ) : null}
          </div>

        </div>

        {showRatingPanel ? (
          <StoryRating
            storyId={story.id}
            initialAverageRating={story.average_rating}
            initialRatingCount={story.rating_count || story.total_rating_count}
            className="storyqq-rating-panel"
            onRatingChange={(nextRating) => {
              setStory((currentStory) => currentStory
                ? {
                  ...currentStory,
                  average_rating: nextRating.average_rating,
                  rating_count: nextRating.rating_count,
                  total_rating_count: nextRating.rating_count,
                }
                : currentStory);
            }}
          />
        ) : null}

        <div className="storyqq-actions">
          {continueChapterNumber ? (
            <Link
              to={`/${story.id}-${story.slug}/${continueChapterNumber}`}
              className="btn-cmc btn-cmc-primary storyqq-icon-action"
              onClick={saveScrollPosition}
              aria-label={storyProgress ? 'Tiếp tục đọc' : 'Bắt đầu đọc'}
              title={storyProgress ? 'Tiếp tục đọc' : 'Bắt đầu đọc'}
              data-tooltip={storyProgress ? 'Tiếp tục đọc' : 'Bắt đầu đọc'}
            >
              <FontAwesomeIcon icon={faBookOpen} />
              <span className="storyqq-action-text">{storyProgress ? 'Tiếp tục đọc' : 'Bắt đầu đọc'}</span>
            </Link>
          ) : null}

          {latestChapter ? (
            <Link
              to={`/${story.id}-${story.slug}/${latestChapter.chapter_number}`}
              className="btn-cmc btn-cmc-outline storyqq-icon-action"
              onClick={saveScrollPosition}
              aria-label="Đọc chương mới nhất"
              title="Đọc chương mới nhất"
              data-tooltip="Chương mới nhất"
            >
              <FontAwesomeIcon icon={faForwardStep} />
              <span className="storyqq-action-text">Chương mới nhất</span>
            </Link>
          ) : null}

          <FollowButton storyId={story.id} responsiveIconOnly />

          <button
            type="button"
            className="btn-cmc btn-cmc-outline storyqq-icon-action"
            onClick={() => setIsReportModalOpen(true)}
            aria-label="Báo cáo truyện"
            title="Báo cáo truyện"
            data-tooltip="Báo cáo"
          >
            <FontAwesomeIcon icon={faFlag} />
            <span className="storyqq-action-text">Báo cáo</span>
          </button>

          <button
            type="button"
            className={`btn-cmc btn-cmc-outline storyqq-icon-action${showRatingPanel ? ' is-active' : ''}`}
            onClick={() => setShowRatingPanel((prev) => !prev)}
            aria-label={showRatingPanel ? 'Ẩn đánh giá truyện' : 'Đánh giá truyện'}
            title={showRatingPanel ? 'Ẩn đánh giá truyện' : 'Đánh giá truyện'}
            data-tooltip={showRatingPanel ? 'Ẩn đánh giá' : 'Đánh giá'}
          >
            <FontAwesomeIcon icon={faStar} />
            <span className="storyqq-action-text">{showRatingPanel ? 'Ẩn đánh giá' : 'Đánh giá'}</span>
          </button>
        </div>
        </section>

        <section className="panel-card mt-4 storyqq-panel" aria-labelledby="chapter-list-heading">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h4 id="chapter-list-heading" className="panel-title mb-0">
            Danh sách chương ({chapterPagination.totalItems || 0})
          </h4>
          <div className="storyqq-chapter-tools">
            <label className="storyqq-chapter-search">
              <span className="visually-hidden">Tìm kiếm chương</span>
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Tìm số hoặc tên chương..."
                aria-label="Tìm kiếm chương"
              />
              {chapterSearch ? (
                <button type="button" onClick={() => { setChapterSearch(''); setDebouncedSearch(''); }} aria-label="Xóa tìm kiếm chương">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              ) : null}
            </label>
            <select
              className="form-select form-select-sm"
              value={sortOrder}
              onChange={(e) => handleSortOrderChange(e.target.value)}
              aria-label="Sắp xếp chương"
            >
              <option value="asc">Sắp xếp: Cũ nhất</option>
              <option value="desc">Sắp xếp: Mới nhất</option>
            </select>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {chapterLoading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'color-mix(in srgb, var(--surface) 30%, transparent)',
                backdropFilter: 'blur(1px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: '8px',
              }}
            >
              <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : null}
          <ul
            className="chapter-list storyqq-chapter-list"
            style={{
              opacity: chapterLoading ? 0.5 : 1,
              pointerEvents: chapterLoading ? 'none' : 'auto',
              transition: 'opacity 0.15s ease',
            }}
          >
            {filteredChapters.map((chapter) => {
              const chapterNumber = Number(chapter.chapter_number || 0);
              const isRead = readChapterNumbers.has(chapterNumber);
              const isLastRead = lastReadChapterNumber > 0 && chapterNumber === lastReadChapterNumber;
              const isUnlocking = unlockingChapterId === chapter.id;
              const linkClass = [
                isLastRead ? 'chapter-link-last-read' : (isRead ? 'chapter-link-is-read' : ''),
                isUnlocking ? 'chapter-link-unlocking' : '',
              ].filter(Boolean).join(' ') || undefined;

              return (
                <li key={chapter.id}>
                  <Link
                    to={`/${story.id}-${story.slug}/${chapter.chapter_number}`}
                    className={linkClass}
                    onClick={() => saveScrollPosition()}
                    aria-current={isLastRead ? 'true' : undefined}
                    aria-disabled={isUnlocking ? 'true' : undefined}
                  >
                    <span className="chapter-title-text text-truncate">
                      Ch.{chapter.chapter_number}: {chapter.title || `Chương ${chapter.chapter_number}`}
                    </span>
                    <span className="chapter-meta-right">
                      {chapter.is_paid ? (
                        chapter.can_read ? (
                          <span className="chapter-badge badge-unlocked">
                            <FontAwesomeIcon icon={faLockOpen} className="me-1" />
                            Đã mở
                          </span>
                        ) : (
                          <span className="chapter-badge badge-locked">
                            <FontAwesomeIcon icon={faLock} className="me-1" />
                            {chapter.unlock_cost || 3} Tinh thạch
                          </span>
                        )
                      ) : null}
                      <span className="text-muted small chapter-upload-date">
                        {isUnlocking
                          ? 'Đang mở khóa...'
                          : formatChapterUploadDate(chapter.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {filteredChapters.length === 0 ? (
              <li className="storyqq-chapter-empty">
                Không tìm thấy chương phù hợp với “{chapterSearch.trim()}”.
                <button type="button" onClick={() => { setChapterSearch(''); setDebouncedSearch(''); }}>
                  Xóa bộ lọc
                </button>
              </li>
            ) : null}
          </ul>
        </div>

        {!chapterSearch.trim() && chapterPagination.totalPages > 1 ? (
          <div
            className="home-pagination mt-3 d-flex justify-content-center align-items-center gap-2"
            role="navigation"
            aria-label="Phân trang danh sách chương"
            style={{
              opacity: chapterLoading ? 0.6 : 1,
              pointerEvents: chapterLoading ? 'none' : 'auto',
              transition: 'opacity 0.15s ease',
            }}
          >
            <button
              type="button"
              className="btn-cmc btn-cmc-outline btn-cmc-sm"
              disabled={chapterPage <= 1 || chapterLoading}
              onClick={() => setChapterPage((p) => Math.max(p - 1, 1))}
              aria-label={`Chuyển đến trang ${Math.max(chapterPage - 1, 1)}`}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="me-1" />
              Trước
            </button>
            <span className="small text-muted fw-semibold px-2">
              Trang{' '}
              <input
                type="number"
                className="storyqq-chapter-pagination-jump"
                min={1}
                max={chapterPagination.totalPages}
                value={chapterPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) {
                    setChapterPage(Math.max(1, Math.min(val, chapterPagination.totalPages)));
                  }
                }}
                aria-label="Nhập số trang"
                disabled={chapterLoading}
              />
              {' '}/ {chapterPagination.totalPages}
            </span>
            <button
              type="button"
              className="btn-cmc btn-cmc-outline btn-cmc-sm"
              disabled={chapterPage >= chapterPagination.totalPages || chapterLoading}
              onClick={() => setChapterPage((p) => Math.min(p + 1, chapterPagination.totalPages))}
              aria-label={`Chuyển đến trang ${Math.min(chapterPage + 1, chapterPagination.totalPages)}`}
            >
              Sau
              <FontAwesomeIcon icon={faChevronRight} className="ms-1" />
            </button>
          </div>
        ) : null}
        </section>

        <section className="mt-4 storyqq-panel-stack">
          <CommentSection key={`story-comments-${story.id}`} storyId={story.id} mode="story" />
        </section>
      </div>
      {isReportModalOpen && (
        <ReportModal 
          storyId={story.id}
          chapterId={null}
          onClose={() => setIsReportModalOpen(false)} 
        />
      )}
    </main>
  );
}

export default StoryDetailPage;
