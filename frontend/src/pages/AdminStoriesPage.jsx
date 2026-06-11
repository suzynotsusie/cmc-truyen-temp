import { useEffect, useState } from 'react';
import API from '../services/api';

function AdminStoriesPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await API.admin.getStories(1);
        setStories(data.data || data || []);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Lỗi khi tải danh sách truyện');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  const filteredStories = search
    ? stories.filter(
        (story) =>
          story.title?.toLowerCase().includes(search.toLowerCase()) ||
          story.author?.toLowerCase().includes(search.toLowerCase())
      )
    : stories;

  if (loading) return <main className="cmc-main"><p>Đang tải...</p></main>;

  return (
    <main className="cmc-main">
      <div className="mb-4">
        <h1>Quản lý truyện</h1>
        <p className="text-muted">
          Quản lý toàn bộ truyện trong hệ thống
        </p>
      </div>

      {error && <div className="alert-cmc mb-3">{error}</div>}

      <div className="panel-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <input
            type="text"
            placeholder="Tìm truyện..."
            className="form-control-cmc"
            style={{ maxWidth: '300px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên truyện</th>
              <th>Tác giả</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {filteredStories.length > 0 ? (
              filteredStories.map((story) => (
                <tr key={story.id}>
                  <td>{story.id}</td>
                  <td>{story.title}</td>
                  <td>{story.author}</td>
                  <td>{story.status}</td>
                  <td>
                    <button className="btn-cmc btn-cmc-sm">
                      Sửa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default AdminStoriesPage;
