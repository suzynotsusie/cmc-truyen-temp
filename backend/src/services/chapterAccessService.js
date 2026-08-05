const { StoryCollaborator, Wallet } = require('../models');

async function getChapterAccess(user, chapter) {
  if (!chapter?.is_paid) {
    return { canRead: true, isUnlocked: false, reason: 'FREE' };
  }
  if (!user?.id) {
    return { canRead: false, isUnlocked: false, reason: 'LOGIN_REQUIRED' };
  }
  const authorId = Number(chapter.story_author_id || chapter.author_id || 0);
  const isAuthorOrCollaborator = (authorId > 0 && authorId === Number(user.id))
    || await StoryCollaborator.isCollaborator(chapter.story_id, user.id);

  if (
    user.role === 'Admin'
    || isAuthorOrCollaborator
  ) {
    return { canRead: true, isUnlocked: false, reason: 'MANAGER' };
  }
  const isUnlocked = await Wallet.hasUnlocked(user.id, chapter.id);
  return { canRead: isUnlocked, isUnlocked, reason: isUnlocked ? 'UNLOCKED' : 'LOCKED' };
}

function lockedChapterResponse(chapter, crystalBalance = null) {
  const fullContent = chapter?.content || '';
  const lines = fullContent.split('\n').map((l) => l.trim()).filter(Boolean);
  const previewText = lines.length > 0 ? lines.slice(0, 4).join('\n\n') : fullContent.slice(0, 300);

  return {
    success: false,
    code: 'CHAPTER_LOCKED',
    message: `Chương này cần ${Wallet.UNLOCK_COST} Tinh thạch để mở khóa.`,
    data: {
      chapter_id: chapter.id,
      story_id: chapter.story_id,
      chapter_number: chapter.chapter_number,
      title: chapter.title,
      content: previewText,
      story_title: chapter.story_title,
      story_slug: chapter.story_slug,
      unlock_cost: Wallet.UNLOCK_COST,
      crystal_balance: crystalBalance,
      is_paid: true,
      can_read: false,
    },
  };
}

module.exports = { getChapterAccess, lockedChapterResponse };
