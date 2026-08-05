const Joi = require('joi');
const { Queue } = require('bullmq');

const { Chapter, Story, StoryCollaborator, Wallet } = require('../models');
const { getChapterAccess, lockedChapterResponse } = require('../services/chapterAccessService');
const { parseStoryUploadFile, parseStoryTextToChapters } = require('../services/storyFileImportService');
const redisConfig = require('../config/redisConfig');

const notificationQueue = new Queue('notificationQueue', { connection: redisConfig });

function isDuplicateChapterNumberError(error) {
  return error?.code === '23505' && (
    error?.constraint === 'chapters_story_id_chapter_number_key'
    || String(error?.detail || '').includes('(story_id, chapter_number)')
  );
}

// Schema validate khi TẠO chương mới
// chapter_number: số thứ tự chương, phải là số nguyên dương (bắt đầu từ 1)
const createChapterSchema = Joi.object({
  title: Joi.string().trim().max(255).required(),
  content: Joi.string().trim().required(),
  chapter_number: Joi.number().integer().min(1).required(),
  is_paid: Joi.boolean().optional(),
}).required();

// Schema validate khi CẬP NHẬT chương (không cho phép đổi chapter_number)
const updateChapterSchema = Joi.object({
  title: Joi.string().trim().max(255).required(),
  content: Joi.string().trim().required(),
  is_paid: Joi.boolean().optional(),
}).required();

const importChapterFileSchema = Joi.object({
  split_chapters: Joi.boolean().optional(),
  start_chapter_number: Joi.number().integer().min(1).optional(),
  title: Joi.string().trim().max(255).allow('', null).optional(),
  raw_text_override: Joi.string().trim().allow('', null).optional(),
  is_paid: Joi.boolean().optional(),
}).required();

const previewChapterFileSchema = Joi.object({
  split_chapters: Joi.boolean().optional(),
  title: Joi.string().trim().max(255).allow('', null).optional(),
}).required();

/**
 * Kiểm tra quyền thao tác với chương (thêm/sửa/xóa).
 * Logic giống storyController: chỉ tác giả hoặc Admin được phép.
 * So sánh Number(...) để tránh lỗi so sánh kiểu dữ liệu khác nhau.
 */
function isStoryOwnerOrAdmin(user, story) {
  if (!user || !story) {
    return false;
  }
  return user.role === 'Admin' || Number(user.id) === Number(story.author_id);
}

/**
 * Kiểm tra xem user có phải cộng tác viên, chủ sở hữu hoặc Admin không.
 */
async function isStoryCollaboratorOrOwnerOrAdmin(user, story) {
  if (!user || !story) return false;
  if (user.role === 'Admin') return true;
  if (Number(user.id) === Number(story.author_id)) return true;
  return await StoryCollaborator.isCollaborator(story.id, user.id);
}

function canAddChapterAfterModeration(user, story) {
  if (user?.role === 'Admin') return true;
  return story?.moderation_status === 'approved' && story?.is_published && !story?.hidden_by_admin;
}

async function enqueueNewChapterNotification(chapter, story) {
  // Chi gui thong bao cho truyen dang hien thi cong khai.
  if (!story?.is_published || story?.hidden_by_admin) {
    return;
  }

  await notificationQueue.add(
    'notify-new-chapter',
    {
      type: 'new_chapter',
      data: {
        storyId: story.id,
        storyTitle: story.title,
        storySlug: story.slug,
        chapterId: chapter.id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
      },
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: 200,
    }
  );
}

/**
 * Lấy danh sách chương của một truyện với pagination và sắp xếp.
 * Hỗ trợ sort ascending (asc) hoặc descending (desc) theo chapter_number.
 * Thường dùng asc để hiển thị từ chương 1 lên, desc để hiển thị chương mới nhất trước.
 */
async function getChapters(req, res) {
  try {
    const { storyId } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const sort = req.query.sort || 'asc';  // Mặc định sắp xếp từ chương đầu tiên
    const story = await Story.getStoryAccessById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }
    if (!story.is_published || story.hidden_by_admin) {
      const isOwnerOrAdmin = req.user && (
        req.user.role === 'Admin' ||
        (req.user.role === 'Moderator' && !story.hidden_by_admin) ||
        Number(req.user.id) === Number(story.author_id)
      );
      const isCollaborator = req.user && await StoryCollaborator.isCollaborator(story.id, req.user.id);
      if (!isOwnerOrAdmin && !isCollaborator) {
        return res.status(404).json({ success: false, message: 'Story not found' });
      }
    }

    const result = await Chapter.getChaptersByStory(storyId, page, limit, sort, req.user?.id || null);
    const privileged = req.user && (
      req.user.role === 'Admin'
      || Number(req.user.id) === Number(story.author_id)
      || await StoryCollaborator.isCollaborator(story.id, req.user.id)
    );
    const chapters = result.chapters.map((chapter) => ({
      ...chapter,
      unlock_cost: chapter.is_paid ? Wallet.UNLOCK_COST : 0,
      can_read: !chapter.is_paid || chapter.is_unlocked || Boolean(privileged),
    }));
    return res.status(200).json({
      success: true,
      chapters,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[chapterController.getChapters]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Lấy chi tiết một chương theo chapterId.
 * Response bao gồm thông tin chương kèm thông tin cơ bản của truyện (story_title, story_slug,...).
 */
async function getChapterById(req, res) {
  try {
    const { chapterId } = req.params;
    const chapter = await Chapter.getChapterById(chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }
    
    // Kiểm tra trạng thái ẩn/hiện của truyện chứa chương này
    if (!chapter.story_is_published || chapter.story_hidden_by_admin) {
      const isOwnerOrAdmin = req.user && (
        req.user.role === 'Admin' ||
        (req.user.role === 'Moderator' && !chapter.story_hidden_by_admin) ||
        Number(req.user.id) === Number(chapter.story_author_id)
      );
      const isCollaborator = req.user && await StoryCollaborator.isCollaborator(chapter.story_id, req.user.id);
      if (!isOwnerOrAdmin && !isCollaborator) {
        return res.status(404).json({ success: false, message: 'Chapter not found' });
      }
    }

    const access = await getChapterAccess(req.user, chapter);
    if (!access.canRead) {
      const wallet = req.user?.id ? await Wallet.getWallet(req.user.id, 1, 1) : null;
      return res.status(403).json(lockedChapterResponse(chapter, wallet?.crystal_balance ?? null));
    }
    return res.status(200).json({
      success: true,
      chapter: { ...chapter, is_unlocked: access.isUnlocked, can_read: true, unlock_cost: chapter.is_paid ? Wallet.UNLOCK_COST : 0 },
    });
  } catch (error) {
    console.error('[chapterController.getChapterById]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Tạo chương mới cho một truyện.
 * Luồng: Xác thực → Kiểm tra truyện tồn tại → Kiểm tra quyền → Validate → Tạo chương
 *
 * Khi tạo chương thành công, model Chapter.createChapter sẽ tự động
 * tăng total_chapters của truyện lên 1 (trong một transaction).
 */
async function createChapter(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { storyId } = req.params;

    // Lấy truyện để xác nhận truyện tồn tại trước khi thêm chương
    const story = await Story.getStoryById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Kiểm tra quyền: chỉ tác giả của truyện, cộng tác viên hoặc Admin mới thêm được chương
    const hasAddPermission = await isStoryCollaboratorOrOwnerOrAdmin(req.user, story);
    if (!hasAddPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (!canAddChapterAfterModeration(req.user, story)) {
      return res.status(409).json({
        success: false,
        message: 'Truyện phải được Moderator duyệt trước khi có thể thêm chương',
      });
    }

    const { error, value } = createChapterSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Xây dựng object dữ liệu chương với storyId từ URL params
    const chapterData = {
      story_id: storyId,
      chapter_number: value.chapter_number,
      title: value.title,
      content: value.content,
      is_paid: value.is_paid ?? value.chapter_number > 3,
    };

    let createdChapter;
    try {
      createdChapter = await Chapter.createChapter(chapterData);
    } catch (error) {
      if (isDuplicateChapterNumberError(error)) {
        return res.status(409).json({
          success: false,
          code: 'CHAPTER_NUMBER_EXISTS',
          message: `Chương ${value.chapter_number} đã tồn tại. Vui lòng chọn số chương khác.`,
        });
      }
      throw error;
    }

    try {
      await enqueueNewChapterNotification(createdChapter, story);
    } catch (notifyError) {
      console.error('[chapterController.createChapter] Failed to enqueue notification:', notifyError);
    }

    return res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      chapter: createdChapter,
    });
  } catch (error) {
    console.error('[chapterController.createChapter]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function importChapterFile(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { storyId } = req.params;
    const story = await Story.getStoryById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    const hasAddPermission = await isStoryCollaboratorOrOwnerOrAdmin(req.user, story);
    if (!hasAddPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (!canAddChapterAfterModeration(req.user, story)) {
      return res.status(409).json({
        success: false,
        message: 'Truyện phải được Moderator duyệt trước khi có thể import chương',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên tệp .txt, .md hoặc .epub hợp lệ',
      });
    }

    const { error, value } = importChapterFileSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    const hasRawOverride = Boolean(value.raw_text_override && value.raw_text_override.trim());
    const chaptersFromFile = hasRawOverride
      ? parseStoryTextToChapters(value.raw_text_override, {
        splitChapters: value.split_chapters,
        singleTitle: value.title,
      })
      : await parseStoryUploadFile(req.file, {
        splitChapters: value.split_chapters,
        singleTitle: value.title,
      });

    const maxChapterNumber = await Chapter.getMaxChapterNumberByStory(storyId);
    const startChapterNumber = value.start_chapter_number || (maxChapterNumber + 1);

    const createdChapters = await Chapter.createChaptersBatch(storyId, chaptersFromFile, {
      startChapterNumber,
      isPaid: value.is_paid,
    });

    try {
      await Promise.all(
        createdChapters.map((chapter) => enqueueNewChapterNotification(chapter, story))
      );
    } catch (notifyError) {
      console.error('[chapterController.importChapterFile] Failed to enqueue notifications:', notifyError);
    }

    return res.status(201).json({
      success: true,
      message: 'Import chapter từ file thành công',
      imported_count: createdChapters.length,
      chapters: createdChapters,
      next_chapter_number: startChapterNumber + createdChapters.length,
    });
  } catch (error) {
    console.error('[chapterController.importChapterFile]', error);
    if (isDuplicateChapterNumberError(error)) {
      return res.status(409).json({
        success: false,
        code: 'CHAPTER_NUMBER_EXISTS',
        message: 'Một hoặc nhiều số chương trong tệp đã tồn tại. Vui lòng chọn số chương bắt đầu khác.',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

async function previewChapterFile(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const story = await Story.getStoryById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const hasPermission = await isStoryCollaboratorOrOwnerOrAdmin(req.user, story);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!canAddChapterAfterModeration(req.user, story)) {
      return res.status(409).json({
        success: false,
        message: 'Truyện phải được Moderator duyệt trước khi có thể xem trước file chương',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên tệp .txt, .md hoặc .epub hợp lệ',
      });
    }

    const { error, value } = previewChapterFileSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    const chapters = await parseStoryUploadFile(req.file, {
      splitChapters: value.split_chapters,
      singleTitle: value.title,
    });

    return res.status(200).json({
      success: true,
      file_name: req.file.originalname,
      chapter_count: chapters.length,
      chapters: chapters.slice(0, 50).map((chapter, index) => ({
        index: index + 1,
        title: chapter.title,
        content_preview: chapter.content.slice(0, 800),
        character_count: chapter.content.length,
      })),
      preview_truncated: chapters.length > 50,
    });
  } catch (error) {
    console.error('[chapterController.previewChapterFile]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Không thể đọc nội dung file',
    });
  }
}

/**
 * Cập nhật nội dung chương (title và content).
 * Không cho phép thay đổi chapter_number (để tránh xáo trộn thứ tự chương).
 */
async function updateChapter(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { storyId, chapterId } = req.params;

    // Kiểm tra truyện cha tồn tại trước khi thao tác với chương
    const story = await Story.getStoryById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Kiểm tra quyền chỉnh sửa ở cấp truyện: chỉ tác giả, cộng tác viên hoặc Admin
    const hasEditPermission = await isStoryCollaboratorOrOwnerOrAdmin(req.user, story);
    if (!hasEditPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Kiểm tra xem chương có thực sự thuộc về story này không (prevent bypass với chapterId từ story khác)
    const chapter = await Chapter.getChapterById(chapterId);
    if (!chapter || Number(chapter.story_id) !== Number(storyId)) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found or does not belong to this story',
      });
    }

    const { error, value } = updateChapterSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    const updatedChapter = await Chapter.updateChapter(chapterId, value);

    // Trường hợp chapterId không tìm thấy trong database
    if (!updatedChapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chapter updated successfully',
      chapter: updatedChapter,
    });
  } catch (error) {
    console.error('[chapterController.updateChapter]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Xóa chương (xóa thật khỏi database, không phải soft delete).
 * Khi xóa thành công, model tự động giảm total_chapters của truyện đi 1.
 */
async function deleteChapter(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { storyId, chapterId } = req.params;
    const story = await Story.getStoryById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    if (!isStoryOwnerOrAdmin(req.user, story)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Kiểm tra xem chương có thực sự thuộc về story này không (prevent bypass với chapterId từ story khác)
    const chapter = await Chapter.getChapterById(chapterId);
    if (!chapter || Number(chapter.story_id) !== Number(storyId)) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found or does not belong to this story',
      });
    }

    const deletedChapter = await Chapter.deleteChapter(chapterId);

    if (!deletedChapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chapter deleted successfully',
      chapter: deletedChapter,
    });
  } catch (error) {
    console.error('[chapterController.deleteChapter]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Lấy chi tiết một chương bằng storySlug và chapterNumber.
 * Kiểm tra trạng thái ẩn/hiện của truyện chứa chương này (phân quyền).
 */
async function getChapterBySlugAndNumber(req, res) {
  try {
    const { storySlug, chapterNumber } = req.params;
    const chapter = await Chapter.getChapterBySlugAndNumber(storySlug, chapterNumber);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Kiểm tra trạng thái ẩn/hiện của truyện chứa chương này
    if (!chapter.story_is_published || chapter.story_hidden_by_admin) {
      const isOwnerOrAdmin = req.user && (
        req.user.role === 'Admin' ||
        (req.user.role === 'Moderator' && !chapter.story_hidden_by_admin) ||
        Number(req.user.id) === Number(chapter.story_author_id)
      );
      const isCollaborator = req.user && await StoryCollaborator.isCollaborator(chapter.story_id, req.user.id);
      if (!isOwnerOrAdmin && !isCollaborator) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found',
        });
      }
    }

    const access = await getChapterAccess(req.user, chapter);
    if (!access.canRead) {
      const wallet = req.user?.id ? await Wallet.getWallet(req.user.id, 1, 1) : null;
      return res.status(403).json(lockedChapterResponse(chapter, wallet?.crystal_balance ?? null));
    }
    return res.status(200).json({
      success: true,
      chapter: { ...chapter, is_unlocked: access.isUnlocked, can_read: true, unlock_cost: chapter.is_paid ? Wallet.UNLOCK_COST : 0 },
    });
  } catch (error) {
    console.error('[chapterController.getChapterBySlugAndNumber]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function unlockChapter(req, res) {
  try {
    const chapter = await Chapter.getChapterById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ success: false, code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found' });
    }
    const access = await getChapterAccess(req.user, chapter);
    if (access.canRead && access.reason !== 'UNLOCKED') {
      return res.status(409).json({
        success: false,
        code: 'CHAPTER_ALREADY_FREE',
        message: 'Chương này không cần mở khóa.',
      });
    }
    const result = await Wallet.unlockChapter(req.user.id, chapter.id);
    return res.status(200).json({
      success: true,
      code: result.already_unlocked ? 'CHAPTER_ALREADY_UNLOCKED' : 'CHAPTER_UNLOCKED',
      message: result.already_unlocked ? 'Chương đã được mở khóa trước đó.' : 'Mở khóa chương thành công.',
      crystal_balance: result.crystal_balance,
      unlock_cost: result.already_unlocked ? 0 : Wallet.UNLOCK_COST,
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_CRYSTALS') {
      return res.status(409).json({
        success: false,
        code: error.code,
        message: 'Bạn không đủ Tinh thạch để mở khóa chương này.',
        crystal_balance: error.crystalBalance,
        unlock_cost: Wallet.UNLOCK_COST,
      });
    }
    if (error.code === 'CHAPTER_ALREADY_FREE') {
      return res.status(409).json({ success: false, code: error.code, message: 'Chương này đang miễn phí.' });
    }
    if (error.code === 'CHAPTER_NOT_FOUND') {
      return res.status(404).json({ success: false, code: error.code, message: 'Chapter not found' });
    }
    console.error('[chapterController.unlockChapter]', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  getChapters,
  getChapterById,
  createChapter,
  previewChapterFile,
  importChapterFile,
  updateChapter,
  deleteChapter,
  getChapterBySlugAndNumber,
  unlockChapter,
};
