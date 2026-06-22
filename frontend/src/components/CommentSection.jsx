import { useCallback, useEffect, useState } from 'react';

import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function CommentSection({ storyId, chapterId = null, mode = 'story' }) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numericStoryId = storyId ? Number(storyId) : null;
  const numericChapterId = chapterId ? Number(chapterId) : null;
  const isChapterMode = mode === 'chapter' && numericChapterId;

  const loadComments = useCallback(async () => {
    if (!numericStoryId && !numericChapterId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setComments([]);

      const response = isChapterMode
        ? await API.comments.getByChapter(numericChapterId, numericStoryId)
        : await API.comments.getByStory(numericStoryId);

      setComments(response.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [numericStoryId, numericChapterId, isChapterMode]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setError('Vui lòng đăng nhập để bình luận.');
      return;
    }
    if (!numericStoryId) {
      setError('Không xác định được truyện.');
      return;
    }
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      await API.comments.create({
        story_id: numericStoryId,
        chapter_id: isChapterMode ? numericChapterId : null,
        content: content.trim(),
        rating: rating || null,
      });
      setContent('');
      setRating(0);
      setHoverRating(0);
      await loadComments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Không gửi được bình luận.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bình luận này?')) return;
    try {
      await API.comments.delete(id);
      await loadComments();
    } catch {
      setError('Không xóa được bình luận.');
    }
  };

  const title = isChapterMode ? 'Bình luận chương này' : 'Bình luận truyện';

  return (
    <section className="panel-card">
      <h4 className="panel-title">
        {title}
        {' '}
        (
        {comments.length}
        )
      </h4>

      {loading ? <p className="text-muted small">Đang tải...</p> : null}

      {!loading && comments.length === 0 ? (
        <p className="text-muted small mb-3">Chưa có bình luận. Hãy là người đầu tiên!</p>
      ) : null}

      <div className="comment-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-item">
                  <div className="d-flex justify-content-between gap-2 mb-1">
                    <strong>{comment.full_name || comment.username || 'Độc giả'}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {comment.rating ? (
                        <div className="star-display" aria-hidden>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < Math.round(comment.rating) ? 'star filled' : 'star'}>★</span>
                          ))}
                        </div>
                      ) : null}
                      <span className="text-muted small">
                        {new Date(comment.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
            <p className="mb-1">{comment.content}</p>
            {(user?.id === comment.user_id || user?.role === 'Admin') && (
              <button type="button" className="btn-link-danger btn-sm" onClick={() => handleDelete(comment.id)}>
                Xóa
              </button>
            )}
          </div>
        ))}
      </div>

      {error ? <p className="text-danger small mt-2">{error}</p> : null}

      <form className="mt-3" onSubmit={handleSubmit}>
        <div className="star-rating" aria-label="Đánh giá bằng sao">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            const isFilled = hoverRating ? value <= hoverRating : value <= rating;
            return (
              <button
                key={value}
                type="button"
                className={isFilled ? 'star filled' : 'star'}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Đánh giá ${value} sao`}
              >
                ★
              </button>
            );
          })}
        </div>
        <textarea
          className="form-control-cmc"
          rows={3}
          placeholder={isAuthenticated ? 'Viết bình luận...' : 'Đăng nhập để bình luận'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!isAuthenticated}
        />
        <button
          type="submit"
          className="btn-cmc btn-cmc-primary mt-2"
          disabled={!isAuthenticated || submitting}
        >
          {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
        </button>
      </form>
    </section>
  );
}

export default CommentSection;
