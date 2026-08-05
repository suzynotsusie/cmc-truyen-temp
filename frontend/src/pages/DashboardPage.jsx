import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TagInput from '../components/TagInput';
import { slugify } from '../utils/slugify';
import { getNextChapterNumber } from '../utils/chapterNumber';
import { FontAwesomeIcon, faBan, faBookOpen, faGem, faMagnifyingGlass, faPenNib } from '../lib/icons';

const EMPTY_STORY = {
  title: '',
  author_name: '',
  description: '',
  category: '',
  cover_image_url: '',
  status: 'Ongoing',
  tags: [],
};

const EMPTY_CHAPTER_FORM = { title: '', content: '', chapter_number: 1, is_paid: false };
const ALLOWED_IMPORT_EXTENSIONS = ['.txt', '.md', '.epub'];

const MODERATION_STATUS = {
  pending: { label: 'Chờ Moderator duyệt', className: 'pending' },
  approved: { label: 'Đã được duyệt', className: 'approved' },
  changes_requested: { label: 'Cần chỉnh sửa', className: 'changes' },
  rejected: { label: 'Bị từ chối', className: 'rejected' },
};

function hasAllowedExtension(fileName, allowedExtensions) {
  const lowerName = String(fileName || '').toLowerCase().trim();
  return allowedExtensions.some((ext) => lowerName.endsWith(ext));
}

function getStoryModerationStatus(story) {
  return story.moderation_status || (story.is_published ? 'approved' : 'pending');
}

function DashboardPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storySearch, setStorySearch] = useState('');
  const [moderationFilter, setModerationFilter] = useState('all');

  // Story modal
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_STORY);
  const [uploading, setUploading] = useState(false);
  const [savingStory, setSavingStory] = useState(false);

  // Chapter modal (add / edit)
  const [chapterModal, setChapterModal] = useState(null); // { story, chapter|null }
  const [chapterForm, setChapterForm] = useState(EMPTY_CHAPTER_FORM);
  const [chapterEntryMode, setChapterEntryMode] = useState('manual');
  const [chapterUploadFile, setChapterUploadFile] = useState(null);
  const [splitChapterFile, setSplitChapterFile] = useState(true);
  const [chapterFilePreview, setChapterFilePreview] = useState(null);
  const [chapterPreviewLoading, setChapterPreviewLoading] = useState(false);
  const [chapterPreviewError, setChapterPreviewError] = useState('');
  const [chapterNumberLoading, setChapterNumberLoading] = useState(false);
  const [savingChapter, setSavingChapter] = useState(false);
  const chapterEditorSessionRef = useRef(0);
  const chapterUploadIsEpub = chapterUploadFile?.name?.toLowerCase().endsWith('.epub') || false;

  // Expanded chapter list per story
  const [expandedStory, setExpandedStory] = useState(null);
  const [storyChapters, setStoryChapters] = useState({}); // { storyId: chapter[] }
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chapterSearch, setChapterSearch] = useState({}); // { storyId: searchText }

  const [message, setMessage] = useState('');

  // Collaborators modal
  const [collabModalStory, setCollabModalStory] = useState(null);
  const [collabList, setCollabList] = useState([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [newCollabEmail, setNewCollabEmail] = useState('');
  const [collabError, setCollabError] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const readTextFromFile = async (file) => {
    try {
      return await file.text();
    } catch {
      return '';
    }
  };

  const validateImportFile = (file) => {
    if (!file) return false;
    return hasAllowedExtension(file.name, ALLOWED_IMPORT_EXTENSIONS);
  };

  const loadChapterFilePreview = async (file, shouldSplit = splitChapterFile) => {
    if (!file || !chapterModal?.story?.id) return;
    try {
      setChapterPreviewLoading(true);
      setChapterPreviewError('');
      setChapterFilePreview(null);
      const preview = await API.chapters.previewFile(chapterModal.story.id, {
        split_chapters: shouldSplit,
        title: chapterForm.title,
      }, file);
      setChapterFilePreview(preview);
    } catch (err) {
      setChapterPreviewError(err?.response?.data?.message || 'Không thể tạo bản xem trước cho file này.');
    } finally {
      setChapterPreviewLoading(false);
    }
  };

  const handleChapterFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setChapterUploadFile(null);
      setChapterFilePreview(null);
      setChapterPreviewError('');
      setChapterForm((prev) => ({ ...prev, content: '' }));
      return;
    }

    if (!validateImportFile(file)) {
      showMessage('File không hợp lệ. Chỉ chấp nhận đuôi .txt, .md hoặc .epub');
      event.target.value = '';
      setChapterUploadFile(null);
      setChapterFilePreview(null);
      setChapterForm((prev) => ({ ...prev, content: '' }));
      return;
    }

    setChapterUploadFile(file);
    if (file.name.toLowerCase().endsWith('.epub')) {
      setChapterForm((prev) => ({ ...prev, content: '' }));
    } else {
      const text = await readTextFromFile(file);
      setChapterForm((prev) => ({ ...prev, content: text || '' }));
    }
    await loadChapterFilePreview(file, splitChapterFile);
  };

  const handleSplitChapterFileChange = (event) => {
    const shouldSplit = event.target.checked;
    setSplitChapterFile(shouldSplit);
    if (chapterUploadFile) loadChapterFilePreview(chapterUploadFile, shouldSplit);
  };

  const selectChapterEntryMode = (mode) => {
    setChapterEntryMode(mode);
    setChapterUploadFile(null);
    setChapterFilePreview(null);
    setChapterPreviewError('');
    setChapterForm((prev) => ({ ...prev, content: '' }));
  };

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (user?.role === 'Admin') {
        response = await API.admin.getStories(1);
      } else {
        response = await API.stories.getMine(1, 50);
      }
      setStories(response.stories || []);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const filteredStories = useMemo(() => {
    const keyword = storySearch.trim().toLocaleLowerCase('vi');
    return stories.filter((story) => {
      const matchesStatus = moderationFilter === 'all'
        || getStoryModerationStatus(story) === moderationFilter;
      const matchesSearch = !keyword || [
        story.title,
        story.author_name,
        story.category,
        story.description,
      ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword));
      return matchesStatus && matchesSearch;
    });
  }, [stories, storySearch, moderationFilter]);

  const loadChaptersForStory = useCallback(async (storyId) => {
    try {
      setChaptersLoading(true);
      const response = await API.chapters.getByStory(storyId, 1, 200);
      setStoryChapters((prev) => ({ ...prev, [storyId]: response.chapters || [] }));
    } catch {
      setStoryChapters((prev) => ({ ...prev, [storyId]: [] }));
    } finally {
      setChaptersLoading(false);
    }
  }, []);

  // ── Story CRUD ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_STORY);
    setStoryModalOpen(true);
  };

  const openEdit = (story) => {
    setEditing(story);
    setForm({
      title: story.title,
      author_name: story.author_name || '',
      description: story.description || '',
      category: story.category || '',
      cover_image_url: story.cover_image_url || '',
      status: story.status || 'Ongoing',
      tags: story.tags?.length ? story.tags.map((t) => t.name) : story.category ? [story.category] : [],
    });
    setStoryModalOpen(true);
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await API.upload.cover(file);
      setForm((f) => ({ ...f, cover_image_url: res.url }));
    } catch {
      showMessage('Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const saveStory = async (event) => {
    event.preventDefault();
    try {
      setSavingStory(true);
      const payload = {
        title: form.title,
        author_name: form.author_name.trim(),
        description: form.description,
        category: form.category || form.tags[0] || null,
        cover_image_url: form.cover_image_url,
        status: form.status,
        tags: form.tags,
      };
      if (editing) {
        await API.stories.update(editing.id, payload);
        showMessage(editing.moderation_status === 'changes_requested' || editing.moderation_status === 'rejected'
          ? 'Đã cập nhật và gửi lại truyện vào hàng chờ duyệt'
          : 'Đã cập nhật truyện');
      } else {
        await API.stories.create({ ...payload, slug: slugify(form.title) });
        showMessage('Đã gửi truyện mới tới Moderator. Bạn có thể thêm chương sau khi truyện được duyệt.');
      }
      setStoryModalOpen(false);
      loadStories();
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSavingStory(false);
    }
  };

  const handleToggleVisibility = async (id) => {
    try {
      const res = await API.stories.toggleVisibility(id);
      loadStories();
      showMessage(res.message || 'Thao tác thành công');
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Không thể thực hiện thao tác');
    }
  };

  // ── Chapter CRUD ──────────────────────────────────────────────────────────

  const closeChapterEditor = () => {
    if (savingChapter) return;
    chapterEditorSessionRef.current += 1;
    setChapterNumberLoading(false);
    setChapterModal(null);
  };

  const openAddChapter = async (story) => {
    const editorSession = chapterEditorSessionRef.current + 1;
    chapterEditorSessionRef.current = editorSession;
    const cachedChapters = storyChapters[story.id] || [];
    const fallbackChapterNumber = getNextChapterNumber(cachedChapters, story.total_chapters);

    setChapterModal({ story, chapter: null });
    setChapterForm({
      title: '',
      content: '',
      chapter_number: fallbackChapterNumber,
      is_paid: Number(fallbackChapterNumber) > 3,
    });
    setChapterUploadFile(null);
    setSplitChapterFile(true);
    setChapterEntryMode('manual');
    setChapterFilePreview(null);
    setChapterPreviewError('');
    setChapterPreviewLoading(false);
    setSavingChapter(false);

    try {
      setChapterNumberLoading(true);
      const response = await API.chapters.getByStory(story.id, 1, 1, 'desc');
      if (chapterEditorSessionRef.current !== editorSession) return;
      setChapterForm((currentForm) => ({
        ...currentForm,
        chapter_number: getNextChapterNumber(response.chapters || [], story.total_chapters),
        is_paid: getNextChapterNumber(response.chapters || [], story.total_chapters) > 3,
      }));
    } catch (error) {
      if (chapterEditorSessionRef.current === editorSession) {
        showMessage(error?.response?.data?.message || 'Không thể xác định số chương tiếp theo. Vui lòng kiểm tra lại số chương trước khi đăng tải.');
      }
    } finally {
      if (chapterEditorSessionRef.current === editorSession) {
        setChapterNumberLoading(false);
      }
    }
  };

  const openEditChapter = (story, chapter) => {
    chapterEditorSessionRef.current += 1;
    setChapterModal({ story, chapter });
    setChapterForm({
      title: chapter.title || '',
      content: chapter.content || '',
      chapter_number: chapter.chapter_number,
      is_paid: Boolean(chapter.is_paid),
    });
    setChapterUploadFile(null);
    setSplitChapterFile(true);
    setChapterEntryMode('manual');
    setChapterFilePreview(null);
    setChapterPreviewError('');
    setChapterPreviewLoading(false);
    setChapterNumberLoading(false);
    setSavingChapter(false);
  };

  const saveChapter = async (event) => {
    event.preventDefault();
    if (savingChapter || chapterNumberLoading) return;

    const { story, chapter } = chapterModal;
    const editorSession = chapterEditorSessionRef.current;
    try {
      setSavingChapter(true);
      if (chapter) {
        await API.chapters.update(story.id, chapter.id, {
          title: chapterForm.title,
          content: chapterForm.content,
          is_paid: chapterForm.is_paid,
        });
        showMessage('Đã cập nhật chương');
      } else {
        if (chapterEntryMode === 'file' && !chapterUploadFile) {
          showMessage('Vui lòng chọn file truyện trước khi đăng tải');
          return;
        }
        if (chapterUploadFile) {
          if (!validateImportFile(chapterUploadFile)) {
            showMessage('File không hợp lệ. Chỉ chấp nhận đuôi .txt, .md hoặc .epub');
            return;
          }
          const importRes = await API.chapters.importFromFile(
            story.id,
            {
              split_chapters: splitChapterFile,
              start_chapter_number: chapterForm.chapter_number,
              title: chapterForm.title,
              raw_text_override: chapterUploadIsEpub ? '' : chapterForm.content,
              is_paid: chapterForm.is_paid,
            },
            chapterUploadFile
          );
          showMessage(`Đã import ${importRes.imported_count || 0} chương từ file`);
        } else {
          await API.chapters.create(story.id, chapterForm);
          showMessage('Đã thêm chương');
        }
        loadStories();
      }
      if (chapterEditorSessionRef.current === editorSession) {
        chapterEditorSessionRef.current += 1;
        setChapterModal(null);
        setSavingChapter(false);
      }
      loadChaptersForStory(story.id); 
    } catch (err) {
      if (chapterEditorSessionRef.current === editorSession) {
        showMessage(err?.response?.data?.message || 'Thao tác chương thất bại');
      }
    } finally {
      if (chapterEditorSessionRef.current === editorSession) {
        setSavingChapter(false);
      }
    }
  };

  const deleteChapter = async (story, chapter) => {
    if (!window.confirm(`Xóa chương ${chapter.chapter_number}: "${chapter.title}"?`)) return;
    try {
      await API.chapters.delete(story.id, chapter.id);
      showMessage('Đã xóa chương');
      loadChaptersForStory(story.id);
      loadStories();
    } catch {
      showMessage('Không xóa được chương');
    }
  };

  const openCollaborators = async (story) => {
    setCollabModalStory(story);
    setNewCollabEmail('');
    setCollabError('');
    setCollabList([]);
    try {
      setCollabLoading(true);
      const res = await API.stories.getCollaborators(story.id);
      setCollabList(res.collaborators || []);
    } catch {
      setCollabError('Không tải được danh sách cộng tác viên');
    } finally {
      setCollabLoading(false);
    }
  };

  const addCollaborator = async (e) => {
    e.preventDefault();
    if (!newCollabEmail.trim()) return;
    setCollabError('');
    try {
      setCollabLoading(true);
      const res = await API.stories.addCollaborator(collabModalStory.id, { email: newCollabEmail.trim() });
      setCollabList((prev) => [...prev, res.collaborator]);
      setNewCollabEmail('');
      showMessage('Đã thêm cộng tác viên');
    } catch (err) {
      setCollabError(err?.response?.data?.message || 'Không thể thêm cộng tác viên');
    } finally {
      setCollabLoading(false);
    }
  };

  const removeCollaborator = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cộng tác viên này khỏi truyện?')) return;
    setCollabError('');
    try {
      setCollabLoading(true);
      await API.stories.removeCollaborator(collabModalStory.id, userId);
      setCollabList((prev) => prev.filter((c) => c.id !== userId));
      showMessage('Đã gỡ cộng tác viên');
    } catch (err) {
      setCollabError(err?.response?.data?.message || 'Không thể xóa cộng tác viên');
    } finally {
      setCollabLoading(false);
    }
  };

  // ── Toggle chapter list ───────────────────────────────────────────────────

  const toggleChapterList = (storyId) => {
    if (expandedStory === storyId) {
      setExpandedStory(null);
    } else {
      setExpandedStory(storyId);
      if (!storyChapters[storyId]) {
        loadChaptersForStory(storyId);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="cmc-main">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="mb-1">Quản lý truyện</h1>
          <p className="text-muted mb-0">
            Xin chào, {user?.full_name || user?.username} ({user?.role})
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/uploader/revenue" className="btn-cmc btn-cmc-outline">
            <FontAwesomeIcon icon={faGem} style={{ color: '#10b981' }} />
            Rút tiền doanh thu
          </Link>
          <button type="button" className="btn-cmc btn-cmc-primary" onClick={openCreate}>
            <FontAwesomeIcon icon={faPenNib} />
            Thêm truyện
          </button>
        </div>
      </div>

      {message ? <div className="alert-cmc mb-3">{message}</div> : null}
      {loading ? <div className="loading-text" aria-label="Đang tải dữ liệu" /> : null}

      {user?.role !== 'Admin' && stories.length > 0 ? (
        <section className="dashboard-story-toolbar" aria-label="Tìm kiếm và lọc truyện">
          <div className="dashboard-story-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              type="search"
              value={storySearch}
              onChange={(event) => setStorySearch(event.target.value)}
              placeholder="Tìm theo tên truyện, tác giả hoặc thể loại..."
              aria-label="Tìm trong danh sách truyện"
            />
          </div>
          <label className="dashboard-story-filter">
            <span>Trạng thái duyệt</span>
            <select value={moderationFilter} onChange={(event) => setModerationFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ Moderator duyệt</option>
              <option value="approved">Đã được duyệt</option>
              <option value="changes_requested">Cần chỉnh sửa</option>
              <option value="rejected">Bị từ chối</option>
            </select>
          </label>
          <div className="dashboard-story-filter-result">
            <strong>{filteredStories.length}</strong>
            <span>/ {stories.length} truyện</span>
          </div>
        </section>
      ) : null}

      <div className="dashboard-grid">
        {filteredStories.map((story) => {
          const isOwner = user?.role === 'Admin' || Number(story.author_id) === Number(user?.id);
          const moderation = MODERATION_STATUS[getStoryModerationStatus(story)] || MODERATION_STATUS.pending;
          const canAddChapters = story.moderation_status === 'approved' && story.is_published && !story.hidden_by_admin;
          return (
            <div key={story.id} className="panel-card">
              <div className="d-flex gap-3">
                {story.cover_image_url ? (
                  <img src={story.cover_image_url} alt="" className="dashboard-thumb" />
                ) : (
                  <div className="dashboard-thumb dashboard-thumb-empty">
                    <FontAwesomeIcon icon={faBookOpen} />
                  </div>
                )}
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h5 className="mb-0">{story.title}</h5>
                    {user?.role !== 'Admin' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: isOwner ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: isOwner ? '#3b82f6' : '#f59e0b',
                        }}
                      >
                        {isOwner ? 'Chủ sở hữu' : 'Cộng tác viên'}
                      </span>
                    )}
                  </div>
                  <p className="small text-muted mb-2">
                    Tác giả: {story.author_name || 'Chưa cập nhật'} · {story.category} · {story.total_chapters} chương · {story.status}
                  </p>
                  {user?.role !== 'Admin' ? (
                    <div className={`story-moderation-status ${moderation.className}`}>
                      <strong>{moderation.label}</strong>
                      {story.moderation_note ? <span>{story.moderation_note}</span> : null}
                    </div>
                  ) : null}
                  <p className="small mb-3 story-clamp">{story.description}</p>
                <div className="d-flex flex-wrap gap-2">
                  <Link to={`/story/${story.id}-${story.slug}`} className="btn-cmc btn-cmc-outline btn-sm">
                    Xem
                  </Link>

                  {user?.role === 'Admin' ? (
                    <button
                      type="button"
                      className={`btn-cmc btn-sm ${story.is_published ? 'btn-cmc-outline' : 'btn-cmc-primary'}`}
                      onClick={() => handleToggleVisibility(story.id)}
                    >
                      {story.is_published ? 'Ẩn truyện' : 'Hiện truyện'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-cmc btn-cmc-outline btn-sm"
                      onClick={() => openEdit(story)}
                    >
                      Sửa truyện
                    </button>
                  )}

                  {canAddChapters ? (
                    <button type="button" className="btn-cmc btn-cmc-primary btn-sm" onClick={() => openAddChapter(story)}>
                      <FontAwesomeIcon icon={faBookOpen} />
                      Thêm chương
                    </button>
                  ) : user?.role !== 'Admin' ? (
                    <span className="dashboard-chapter-locked" title="Chỉ có thể thêm chương sau khi Moderator duyệt truyện">
                      <FontAwesomeIcon icon={faBan} /> Chưa thể thêm chương
                    </span>
                  ) : null}

                  {isOwner && (
                    <button
                      type="button"
                      className="btn-cmc btn-cmc-outline btn-sm"
                      onClick={() => openCollaborators(story)}
                    >
                      Cộng tác viên
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-cmc btn-cmc-outline btn-sm"
                    onClick={() => toggleChapterList(story.id)}
                  >
                    {expandedStory === story.id ? '▲ Ẩn chương' : '▼ Xem chương'}
                  </button>

                  {user?.role !== 'Admin' && story.hidden_by_admin ? (
                    <span className="dashboard-chapter-locked danger" title="Truyện này đã bị Admin ẩn">
                      <FontAwesomeIcon icon={faBan} /> Admin ẩn
                    </span>
                  ) : null}
                </div>

                {/* Inline chapter list */}
                {expandedStory === story.id && (
                  <div className="mt-3">
                    {chaptersLoading ? (
                      <div className="loading-text" aria-label="Đang tải danh sách chương" />
                    ) : (storyChapters[story.id] || []).length === 0 ? (
                      <p className="small text-muted">Chưa có chương nào.</p>
                    ) : (
                      <>
                        <div className="mb-2 dashboard-chapter-search">
                          <FontAwesomeIcon icon={faMagnifyingGlass} />
                          <input
                            type="search"
                            placeholder="Tìm chương..."
                            value={chapterSearch[story.id] || ''}
                            onChange={(e) => setChapterSearch({...chapterSearch, [story.id]: e.target.value})}
                            className="dashboard-chapter-search-input"
                          />
                        </div>
                        <ul className="chapter-list chapter-list-compact" style={{maxHeight: '300px', overflowY: 'auto'}}>
                          {(storyChapters[story.id] || [])
                            .filter((ch) => {
                              const search = (chapterSearch[story.id] || '').toLowerCase().trim();
                              if (!search) return true;
                              return ch.chapter_number.toString().includes(search) || 
                                     (ch.title && ch.title.toLowerCase().includes(search));
                            })
                            .map((ch) => (
                          <li key={ch.id} className="d-flex justify-content-between align-items-center py-1">
                            <span className="small">
                              Ch.{ch.chapter_number}: {ch.title}
                            </span>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn-cmc btn-cmc-outline btn-xs"
                                onClick={() => openEditChapter(story, ch)}
                              >
                                Sửa
                              </button>
                              {isOwner && (
                                <button
                                  type="button"
                                  className="btn-link-danger btn-xs"
                                  onClick={() => deleteChapter(story, ch)}
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {!loading && stories.length === 0 ? (
        <p className="text-muted">Chưa có truyện. Bấm &quot;Thêm truyện&quot; để bắt đầu.</p>
      ) : null}

      {!loading && stories.length > 0 && filteredStories.length === 0 ? (
        <div className="dashboard-story-empty-filter">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <strong>Không tìm thấy truyện phù hợp</strong>
          <span>Hãy thử từ khóa khác hoặc chọn lại trạng thái duyệt.</span>
          <button type="button" onClick={() => { setStorySearch(''); setModerationFilter('all'); }}>
            Xóa bộ lọc
          </button>
        </div>
      ) : null}

      {/* ── Story modal ──────────────────────────────────────────────────── */}
      {storyModalOpen ? (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setStoryModalOpen(false)}>
          <div className="modal-content story-form-modal">
            <button type="button" className="close-modal" onClick={() => setStoryModalOpen(false)}>&times;</button>
            <header className="story-form-header">
              <span>{editing ? 'Cập nhật tác phẩm' : 'Tác phẩm mới'}</span>
              <h2>{editing ? 'Chỉnh sửa thông tin truyện' : 'Thêm truyện mới'}</h2>
              <p>{editing
                ? 'Hoàn thiện thông tin để người đọc dễ tìm thấy tác phẩm.'
                : 'Gửi thông tin tác phẩm trước. Sau khi Moderator duyệt, bạn mới có thể đăng chương.'}</p>
            </header>

            {!editing ? (
              <div className="story-approval-flow" aria-label="Quy trình xuất bản">
                <div className="active"><strong>1</strong><span>Tạo thông tin</span></div>
                <div><strong>2</strong><span>Moderator duyệt</span></div>
                <div><strong>3</strong><span>Thêm chương</span></div>
              </div>
            ) : null}

            <form onSubmit={saveStory} className="story-create-form">
              <div className="story-create-fields">
                <label className="story-form-field">
                  <span>Tiêu đề truyện <b>*</b></span>
                  <input
                    className="form-control-cmc"
                    placeholder="Ví dụ: Hành trình qua miền ký ức"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={255}
                    required
                  />
                  <small>{form.title.length}/255 ký tự</small>
                </label>

                <label className="story-form-field">
                  <span>Tên tác giả <b>*</b></span>
                  <input
                    className="form-control-cmc"
                    placeholder="Ví dụ: Kim Dung"
                    value={form.author_name}
                    onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                    maxLength={255}
                    required
                  />
                  <small>Tên tác giả của tác phẩm, không phải tài khoản người đăng.</small>
                </label>

                <label className="story-form-field">
                  <span>Giới thiệu truyện <b>*</b></span>
                  <textarea
                    className="form-control-cmc"
                    rows={6}
                    placeholder="Tóm tắt bối cảnh, nhân vật và điểm hấp dẫn của truyện..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </label>

                <div className="story-form-row">
                  <label className="story-form-field">
                    <span>Tiến độ sáng tác</span>
                    <select className="form-control-cmc" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="Ongoing">Đang ra</option>
                      <option value="Completed">Hoàn thành</option>
                      <option value="Hiatus">Tạm dừng</option>
                    </select>
                  </label>
                  <label className="story-form-field">
                    <span>Thể loại chính</span>
                    <input
                      className="form-control-cmc"
                      placeholder="Ví dụ: Tiên hiệp"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </label>
                </div>

                <div className="story-form-field">
                  <span>Thẻ nội dung</span>
                  <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
                  <small>Thêm các từ khóa giúp người đọc tìm thấy truyện chính xác hơn.</small>
                </div>
              </div>

              <aside className="story-cover-panel">
                <span className="story-cover-panel__label">Ảnh bìa</span>
                <div className="story-cover-preview">
                  {form.cover_image_url ? (
                    <img src={form.cover_image_url} alt="Xem trước ảnh bìa" />
                  ) : (
                    <div><FontAwesomeIcon icon={faBookOpen} /><span>Chưa có ảnh bìa</span></div>
                  )}
                </div>
                <label className="story-cover-upload">
                  <span>{uploading ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy'}</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploading} />
                </label>
                <input
                  className="form-control-cmc"
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="Hoặc dán URL ảnh bìa"
                />
                <small>Nên dùng ảnh dọc, tỷ lệ 2:3 và dung lượng dưới 5 MB.</small>
              </aside>

              <footer className="story-form-actions">
                <button type="button" className="btn-cmc btn-cmc-outline" onClick={() => setStoryModalOpen(false)} disabled={savingStory}>Hủy</button>
                <button type="submit" className="btn-cmc btn-cmc-primary" disabled={uploading || savingStory}>
                  {savingStory ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Gửi Moderator duyệt'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Chapter modal (Wattpad Style - FULL SCREEN) ────────────────────────────────────── */}
      {chapterModal ? (
        <div className="chapter-editor-shell">
          <form onSubmit={saveChapter} className="chapter-editor-form">
            
            {/* Thanh Navbar trên cùng giống hệt Wattpad */}
            <div className="chapter-editor-topbar">
              <div className="d-flex align-items-center gap-3">
                <button
                  type="button"
                  className="chapter-editor-backbtn"
                  onClick={closeChapterEditor}
                  disabled={savingChapter}
                >
                  ←
                </button>
                <div className="text-muted chapter-editor-title">
                  {chapterModal.chapter ? `Sửa chương` : `Thêm chương mới`} — {chapterModal.story.title}
                </div>
              </div>
              <button
                type="submit"
                className="btn-cmc btn-cmc-primary chapter-editor-submit"
                disabled={chapterPreviewLoading || chapterNumberLoading || savingChapter}
              >
                {savingChapter
                  ? 'Đang lưu...'
                  : chapterNumberLoading
                    ? 'Đang kiểm tra...'
                    : chapterModal.chapter ? 'Lưu' : 'Đăng tải'}
              </button>
            </div>

            {/* Khu vực soạn thảo căn giữa trang */}
            <div className="wattpad-editor-container mx-auto chapter-editor-container">
              {!chapterModal.chapter ? (
                <div className="chapter-entry-methods" aria-label="Phương thức thêm nội dung truyện">
                  <button
                    type="button"
                    className={chapterEntryMode === 'manual' ? 'is-active' : ''}
                    onClick={() => selectChapterEntryMode('manual')}
                  >
                    <FontAwesomeIcon icon={faPenNib} />
                    <span><strong>Soạn thủ công</strong><small>Nhập trực tiếp nội dung một chương</small></span>
                  </button>
                  <button
                    type="button"
                    className={chapterEntryMode === 'file' ? 'is-active' : ''}
                    onClick={() => selectChapterEntryMode('file')}
                  >
                    <FontAwesomeIcon icon={faBookOpen} />
                    <span><strong>Tải lên từ file</strong><small>Nhập TXT, Markdown hoặc EPUB</small></span>
                  </button>
                </div>
              ) : null}

              {!chapterModal.chapter && (
                <div className="mb-3">
                  <label className="small text-muted d-block mb-1" htmlFor="chapter-start-number">
                    {chapterEntryMode === 'file' && splitChapterFile ? 'Chương bắt đầu' : 'Số chương'}
                  </label>
                  <input
                    id="chapter-start-number"
                    type="number"
                    min="1"
                    step="1"
                    placeholder={chapterEntryMode === 'file' && splitChapterFile
                      ? 'VD: 1 (sẽ tạo lần lượt Chương 1, 2, 3...)'
                      : 'VD: 1'}
                    className="wattpad-input-muted"
                    value={chapterForm.chapter_number}
                    onChange={(e) => setChapterForm({
                      ...chapterForm,
                      chapter_number: e.target.value,
                    })}
                    disabled={chapterNumberLoading || savingChapter}
                    required
                  />
                  <p className="small text-muted mb-0 mt-1">
                    {chapterEntryMode === 'file' && splitChapterFile
                      ? 'Nhập số chương đầu tiên. Hệ thống sẽ tự tăng cho các chương tách ra từ file.'
                      : 'Nhập số chương bạn muốn hiển thị cho chương này.'}
                  </p>
                </div>
              )}
              <label className="d-flex align-items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={Boolean(chapterForm.is_paid)}
                  onChange={(event) => setChapterForm({
                    ...chapterForm,
                    is_paid: event.target.checked,
                  })}
                />
                <span>
                  <strong>Chương trả phí</strong>
                  <small className="d-block text-muted">Giá mở khóa cố định: 3 Tinh thạch</small>
                </span>
              </label>
              <input
                type="text"
                placeholder={chapterEntryMode === 'file' && splitChapterFile ? 'Tiêu đề dự phòng (tùy chọn)' : 'Tiêu đề chương'}
                className="wattpad-input-title"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                required={chapterEntryMode === 'manual' || !splitChapterFile}
              />

              {!chapterModal.chapter && chapterEntryMode === 'file' ? (
                <section className="chapter-file-upload-panel">
                  <div className="chapter-file-upload-heading">
                    <div><strong>Tải nội dung truyện</strong><span>File chỉ được dùng để xem trước cho đến khi bạn nhấn Đăng tải.</span></div>
                    <span className="chapter-file-format-badge">TXT · MD · EPUB</span>
                  </div>

                  <label className={`chapter-file-dropzone${chapterUploadFile ? ' has-file' : ''}`}>
                    <FontAwesomeIcon icon={faBookOpen} />
                    <span>
                      <strong>{chapterUploadFile?.name || 'Chọn file từ máy tính'}</strong>
                      <small>{chapterUploadFile
                        ? `${(chapterUploadFile.size / 1024 / 1024).toFixed(2)} MB · Nhấn để chọn file khác`
                        : 'Dung lượng tối đa 25 MB'}</small>
                    </span>
                    <input
                      type="file"
                      accept=".txt,.md,.epub,text/plain,text/markdown,application/epub+zip"
                      onChange={handleChapterFileChange}
                      required
                    />
                  </label>

                  <label className="chapter-file-split-option">
                    <input type="checkbox" checked={splitChapterFile} onChange={handleSplitChapterFileChange} />
                    <span><strong>Tự động tách chương</strong><small>Nhận diện tiêu đề chương trong TXT/MD; EPUB được đọc theo thứ tự nội dung của sách.</small></span>
                  </label>

                  {chapterPreviewLoading ? (
                    <div className="chapter-file-preview-state">Đang đọc và phân tích file...</div>
                  ) : null}
                  {chapterPreviewError ? (
                    <div className="chapter-file-preview-state is-error">{chapterPreviewError}</div>
                  ) : null}
                  {chapterFilePreview ? (
                    <div className="chapter-file-preview">
                      <header>
                        <div><strong>Xem trước nội dung</strong><span>{chapterFilePreview.chapter_count} chương được nhận diện</span></div>
                        <small>{chapterFilePreview.file_name}</small>
                      </header>
                      <div className="chapter-file-preview-list">
                        {chapterFilePreview.chapters.map((chapter) => (
                          <article key={`${chapter.index}-${chapter.title}`}>
                            <span>Chương {chapter.index}</span>
                            <strong>{chapter.title}</strong>
                            <p>{chapter.content_preview || 'Chương này chưa có nội dung xem trước.'}</p>
                            <small>{Number(chapter.character_count || 0).toLocaleString('vi-VN')} ký tự</small>
                          </article>
                        ))}
                      </div>
                      {chapterFilePreview.preview_truncated ? <p className="chapter-file-preview-note">Chỉ hiển thị 50 chương đầu trong bản xem trước.</p> : null}
                    </div>
                  ) : null}
                </section>
              ) : (
                <textarea
                  placeholder="Nhập nội dung chương của bạn vào đây..."
                  className="wattpad-input-content"
                  value={chapterForm.content}
                  onChange={(e) => setChapterForm({ ...chapterForm, content: e.target.value })}
                  required
                />
              )}
            </div>
          </form>
        </div>
      ) : null}
      {/* ── Collaborators modal ────────────────────────────────────────────── */}
      {collabModalStory ? (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCollabModalStory(null)}>
          <div className="modal-content">
            <button type="button" className="close-modal" onClick={() => setCollabModalStory(null)}>&times;</button>
            <h2 className="mb-3">Cộng tác viên — {collabModalStory.title}</h2>
            
            {collabError && <div className="alert-cmc alert-cmc-danger mb-3" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '6px' }}>{collabError}</div>}
            
            <form onSubmit={addCollaborator} className="d-flex gap-2 my-3">
              <input
                type="email"
                className="form-control-cmc flex-grow-1"
                placeholder="Nhập email của uploader..."
                value={newCollabEmail}
                onChange={(e) => setNewCollabEmail(e.target.value)}
                disabled={collabLoading}
                required
              />
              <button type="submit" className="btn-cmc btn-cmc-primary" disabled={collabLoading}>
                Thêm
              </button>
            </form>

            <div className="mt-3">
              <h5 className="mb-2">Danh sách thành viên</h5>
              {collabLoading && collabList.length === 0 ? (
                <div className="loading-text" aria-label="Đang tải cộng tác viên" />
              ) : collabList.length === 0 ? (
                <p className="small text-muted">Chưa có cộng tác viên nào. Nhập email phía trên để thêm.</p>
              ) : (
                <ul className="list-unstyled d-grid gap-2" style={{ padding: 0 }}>
                  {collabList.map((collab) => (
                    <li key={collab.id} className="d-flex align-items-center justify-content-between p-2 rounded dashboard-collaborator-item">
                      <div className="d-flex align-items-center gap-2">
                        {collab.avatar_url ? (
                          <img src={collab.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                            {collab.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="small fw-semibold mb-0" style={{ fontSize: '0.9rem' }}>{collab.full_name || collab.username}</p>
                          <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>{collab.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-link-danger btn-xs"
                        onClick={() => removeCollaborator(collab.id)}
                        disabled={collabLoading}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        Gỡ
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default DashboardPage;
