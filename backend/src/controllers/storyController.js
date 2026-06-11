const Joi = require('joi');

const { Story } = require('../models');
const Tag = require('../models/Tag');

// Schema validate dữ liệu khi TẠO MỚI truyện
// - title, slug, description: bắt buộc
// - slug: URL-friendly string cho đường dẫn truyện (/story/ten-truyen)
// - tags: mảng tối đa 20 tag, mỗi tag tối đa 100 ký tự
const createStorySchema = Joi.object({
  title: Joi.string().trim().max(255).required(),
  slug: Joi.string().trim().max(255).required(),
  description: Joi.string().trim().required(),
  cover_image_url: Joi.string().trim().max(500).allow('', null),
  category: Joi.string().trim().max(100).allow('', null),
  tags: Joi.array().items(Joi.string().trim().max(100)).max(20),
});

// Schema validate dữ liệu khi CẬP NHẬT truyện
// - .min(1): Yêu cầu ít nhất 1 trường phải được gửi lên (tránh request rỗng vô nghĩa)
// - status: cho phép thay đổi trạng thái (Ongoing / Completed / Hiatus)
const updateStorySchema = Joi.object({
  title: Joi.string().trim().max(255).optional(),
  description: Joi.string().trim().optional(),
  cover_image_url: Joi.string().trim().max(500).allow('', null).optional(),
  category: Joi.string().trim().max(100).allow('', null).optional(),
  status: Joi.string().valid('Ongoing', 'Completed', 'Hiatus').optional(),
  tags: Joi.array().items(Joi.string().trim().max(100)).max(20),
}).min(1);

/**
 * Kiểm tra quyền chỉnh sửa/xóa truyện.
 * Chỉ CHỦ SỞ HỮU (tác giả) hoặc ADMIN mới được thao tác với truyện.
 * So sánh Number(...) để tránh lỗi type mismatch (string vs number) từ JWT payload và DB.
 *
 * @param {object} user - req.user từ JWT payload
 * @param {object} story - Story object từ database
 * @returns {boolean} true nếu được phép, false nếu không
 */
function isStoryOwnerOrAdmin(user, story) {
  if (!user || !story) {
    return false;
  }

  // Admin có quyền thao tác với mọi truyện
  // Còn lại chỉ tác giả (author_id khớp với user.id) mới được phép
  return user.role === 'Admin' || Number(user.id) === Number(story.author_id);
}

/**
 * Lấy danh sách tất cả truyện đã published với pagination và sắp xếp.
 * Hỗ trợ 3 chế độ sắp xếp: newest (mới nhất), popular (nhiều follow nhất), updated (cập nhật gần đây)
 */
async function getAllStories(req, res) {
  try {
    // Đọc tham số phân trang và sắp xếp từ query string
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const sortBy = req.query.sortBy || 'newest';
    const result = await Story.getAllStories(page, limit, sortBy);

    return res.status(200).json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[storyController.getAllStories]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Lấy chi tiết một truyện theo ID.
 * Bao gồm: thông tin tác giả, số chương, danh sách tags.
 */
async function getStoryById(req, res) {
  try {
    const { id } = req.params;
    const story = await Story.getStoryById(id);

    // Trả về 404 nếu không tìm thấy truyện với ID đó
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    return res.status(200).json({
      success: true,
      story,
    });
  } catch (error) {
    console.error('[storyController.getStoryById]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Tạo truyện mới.
 * Luồng: Xác thực user → Validate data → Tạo story → Gán tags → Trả về kết quả
 *
 * Xử lý tags thông minh:
 * - Nếu client gửi tags rõ ràng, dùng tags đó
 * - Nếu không có tags nhưng có category, tự động tạo tag từ category
 * - Nếu không có cả hai, bỏ qua
 */
async function createStory(req, res) {
  try {
    // Kiểm tra xác thực: chỉ user đã đăng nhập mới tạo được truyện
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { error, value } = createStorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Xây dựng object dữ liệu truyện, gán author_id từ JWT của user hiện tại
    const storyData = {
      title: value.title,
      slug: value.slug,
      author_id: req.user.id,  // Tác giả chính là người đang đăng nhập
      description: value.description,
      cover_image_url: value.cover_image_url || null,
      category: value.category || null,
    };

    const createdStory = await Story.createStory(storyData);

    // Xử lý tags: ưu tiên tags được gửi lên, fallback về category nếu không có tags
    let tags = [];
    if (value.tags?.length) {
      // Client gửi tags rõ ràng => dùng tags đó
      tags = await Tag.setStoryTags(createdStory.id, value.tags);
    } else if (value.category) {
      // Không có tags => tự động tạo tag từ category
      tags = await Tag.setStoryTags(createdStory.id, [value.category]);
    }

    return res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: { ...createdStory, tags }, // Merge tags vào story object trả về
    });
  } catch (error) {
    console.error('[storyController.createStory]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Cập nhật thông tin truyện.
 * Kiểm tra quyền sở hữu trước khi cho phép chỉnh sửa.
 * Tags được cập nhật toàn bộ nếu có gửi lên (replace all, không phải merge).
 */
async function updateStory(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Lấy truyện hiện tại để kiểm tra quyền sở hữu
    const existingStory = await Story.getStoryById(id);

    if (!existingStory) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Kiểm tra quyền: chỉ tác giả hoặc Admin mới được cập nhật
    if (!isStoryOwnerOrAdmin(req.user, existingStory)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { error, value } = updateStorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    const updatedStory = await Story.updateStory(id, value);

    if (!updatedStory) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Lấy tags hiện tại hoặc cập nhật tags mới nếu client có gửi
    // Nếu client không gửi tags field, giữ nguyên tags cũ
    let tags = await Tag.getTagsForStory(id);
    if (value.tags) {
      tags = await Tag.setStoryTags(id, value.tags); // Thay thế toàn bộ tags cũ
    }

    return res.status(200).json({
      success: true,
      message: 'Story updated successfully',
      story: { ...updatedStory, tags },
    });
  } catch (error) {
    console.error('[storyController.updateStory]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Xóa truyện (soft delete: đánh dấu is_published = false, không xóa thật).
 * Bảo toàn dữ liệu lịch sử đọc, bình luận liên quan khi "xóa" truyện.
 */
async function deleteStory(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Lấy truyện để kiểm tra tồn tại và quyền sở hữu trước khi xóa
    const existingStory = await Story.getStoryById(id);

    if (!existingStory) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Chỉ tác giả hoặc Admin mới được xóa truyện
    if (!isStoryOwnerOrAdmin(req.user, existingStory)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const deletedStory = await Story.deleteStory(id);

    return res.status(200).json({
      success: true,
      message: 'Story deleted successfully',
      story: deletedStory,
    });
  } catch (error) {
    console.error('[storyController.deleteStory]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Lấy danh sách truyện của user hiện tại (dashboard).
 * Admin có thể xem truyện của bất kỳ user nào bằng cách truyền author_id query param.
 * User thường chỉ xem được truyện của chính mình.
 */
async function getMyStories(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    // Admin có thể lọc theo author_id bất kỳ để quản lý truyện của user khác
    // User thường chỉ lấy truyện của chính mình (req.user.id)
    const authorId = req.user.role === 'Admin' && req.query.author_id
      ? req.query.author_id
      : req.user.id;

    const result = await Story.getStoriesByAuthor(authorId, page, limit);

    return res.status(200).json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[storyController.getMyStories]', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Tìm kiếm truyện theo từ khóa, thể loại và tag.
 * Hỗ trợ tìm kiếm kết hợp (full-text search trên title/description + lọc category + lọc tag).
 * Không yêu cầu đăng nhập (public endpoint).
 */
async function searchStories(req, res) {
  try {
    // q: từ khóa tìm kiếm (tìm trong title và description)
    const query = req.query.q || '';
    // category: lọc theo thể loại chính xác (exact match)
    const category = req.query.category || null;
    // tag hoặc tag_slug: lọc theo tag (hỗ trợ cả hai cách gọi)
    const tag = req.query.tag || req.query.tag_slug || null;
    const page = req.query.page || 1;
    const limit = req.query.limit || 12;

    const result = await Story.searchStories(query, category, tag, page, limit);

    return res.status(200).json({
      success: true,
      stories: result.stories,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[storyController.searchStories]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

module.exports = {
  getAllStories,
  getStoryById,
  getMyStories,
  createStory,
  updateStory,
  deleteStory,
  searchStories,
};