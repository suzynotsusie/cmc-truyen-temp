import { useEffect, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function AdminPage() {
  const { user } = useAuth();
  const authorId = user?.id;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  const loadStats = async () => {
    try {
      const response = await API.admin.getStats();
      setStats(response.stats || response);
    } catch (error) {
      console.error('Error loading stats:', error);
      setMessage('Lỗi khi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  // Hàm loadStories tập trung, hỗ trợ filter theo limit
  const loadStories = async (currentLimit) => {
    setStoriesLoading(true);
    try {
      const response = await API.admin.getStories(1, currentLimit);
      if (response && response.stories) {
        // Cắt mảng để đảm bảo chỉ hiển thị đúng số lượng limit
        const limitedStories = response.stories.slice(0, currentLimit);
        setStories(limitedStories);
      } else {
        setStories([]);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      setMessage('Lỗi khi tải danh sách truyện');
    } finally {
      setStoriesLoading(false);
    }
  };

  // Chỉ dùng 1 useEffect để load danh sách khi limit hoặc authorId thay đổi
  useEffect(() => {
    loadStories(limit);
  }, [limit, authorId]);

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <main className="cmc-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="mb-1">Admin Dashboard</h1>
          <p className="text-muted">Manage your story platform</p>
        </div>
      </div>

      {message && <div className="alert-cmc mb-3">{message}</div>}

      {loading ? <p>Đang tải...</p> : stats && (
        <>
          <div className="panel-card mb-4">
            <h4 className="panel-title">Tổng quan hệ thống</h4>
            <div className="stats-row">
              <div className="stat-box"><strong>{stats?.users || 0}</strong><span>Người Dùng</span></div>
              <div className="stat-box"><strong>{stats?.stories || 0}</strong><span>Truyện</span></div>
              <div className="stat-box"><strong>{stats?.chapters || 0}</strong><span>Chương</span></div>
              <div className="stat-box"><strong>{stats?.comments || 0}</strong><span>Bình Luận</span></div>
            </div>
          </div>

          <div className="panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 className="panel-title" style={{ margin: 0 }}>Truyện mới nhất</h4>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="form-control-cmc"
                style={{ maxWidth: '120px' }}
              >
                <option value={10}>10 truyện</option>
                <option value={20}>20 truyện</option>
                <option value={30}>30 truyện</option>
              </select>
            </div>

            {storiesLoading ? <p>Đang tải...</p> : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên truyện</th>
                      <th>Tác giả</th>
                      <th>Chương</th>
                      <th>Theo dõi</th>
                      <th>Thể loại</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.length > 0 ? stories.map((story) => (
                      <tr key={story.id}>
                        <td>{story.id}</td>
                        <td>{story.title}</td>
                        <td>{story.author_full_name || story.author_username || 'N/A'}</td>
                        <td>{story.chapter_count || story.total_chapters || 0}</td>
                        <td>{story.follow_count || story.followers || 0}</td>
                        <td>{story.category || 'N/A'}</td>
                        <td>{story.status || 'Đang phát hành'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" style={{ textAlign: 'center' }}>Không có dữ liệu</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default AdminPage;