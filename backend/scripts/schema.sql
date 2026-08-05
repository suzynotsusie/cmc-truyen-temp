-- =============================================================================
-- CMC Truyện PostgreSQL Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Shared trigger for updated_at columns
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    role VARCHAR(50) NOT NULL DEFAULT 'User'
        CHECK (role IN ('Admin', 'Uploader', 'User', 'Moderator')),
    bio TEXT,
    crystal_balance INTEGER NOT NULL DEFAULT 50 CHECK (crystal_balance >= 0),
    crystal_earned INTEGER NOT NULL DEFAULT 0 CHECK (crystal_earned >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- -----------------------------------------------------------------------------
-- stories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    author_id INTEGER REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    category VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Ongoing'
        CHECK (status IN ('Ongoing', 'Completed', 'Hiatus')),
    total_chapters INTEGER NOT NULL DEFAULT 0,
    weekly_views INTEGER NOT NULL DEFAULT 0,
    monthly_views INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    average_rating NUMERIC(4,2) NOT NULL DEFAULT 0,
    total_rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN NOT NULL DEFAULT false,
    hidden_by_admin BOOLEAN NOT NULL DEFAULT false,
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'approved', 'changes_requested', 'rejected')),
    moderation_note TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- chapters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (story_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS chapter_unlocks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    crystal_cost INTEGER NOT NULL CHECK (crystal_cost >= 0),
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS crystal_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL CHECK (type IN ('DEMO_GRANT', 'CHAPTER_UNLOCK', 'TOPUP', 'CHAPTER_REVENUE')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topup_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    crystal_received INTEGER NOT NULL,
    transfer_content VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- reading_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    story_id INTEGER REFERENCES stories(id),
    last_chapter_read INTEGER,
    last_read_position INTEGER NOT NULL DEFAULT 0,
    total_read_time INTEGER NOT NULL DEFAULT 0,
    completion_rate FLOAT NOT NULL DEFAULT 0,
    last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, story_id)
);

-- -----------------------------------------------------------------------------
-- user_chapter_reads
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_chapter_reads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, chapter_id)
);

-- -----------------------------------------------------------------------------
-- user_follows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_follows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    story_id INTEGER REFERENCES stories(id),
    followed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, story_id)
);

-- -----------------------------------------------------------------------------
-- comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    story_id INTEGER REFERENCES stories(id),
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending', 'approved', 'masked', 'flagged', 'rejected')),
    is_spam BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);

-- -----------------------------------------------------------------------------
-- comment_votes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comment_votes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);

-- -----------------------------------------------------------------------------
-- ratings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (story_id, user_id)
);

-- -----------------------------------------------------------------------------
-- user_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    dark_mode BOOLEAN NOT NULL DEFAULT false,
    font_size INTEGER NOT NULL DEFAULT 16,
    line_spacing FLOAT NOT NULL DEFAULT 1.5,
    font_family VARCHAR(100) NOT NULL DEFAULT 'Arial',
    theme_color VARCHAR(50) NOT NULL DEFAULT 'default',
    auto_bookmark BOOLEAN NOT NULL DEFAULT true,
    auto_unlock_next_chapter BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- ai_summaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_summaries (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER UNIQUE REFERENCES chapters(id),
    summary TEXT,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- story_collaborators
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_collaborators (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(500),
    type VARCHAR(50) NOT NULL DEFAULT 'new_chapter'
        CHECK (type IN ('new_chapter', 'system', 'announcement')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- notification_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_new_chapter BOOLEAN NOT NULL DEFAULT true,
    push_new_chapter BOOLEAN NOT NULL DEFAULT true,
    email_system BOOLEAN NOT NULL DEFAULT true,
    push_system BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    affected_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_stories_author_id ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stories_published_created ON stories(created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_stories_published_updated ON stories(updated_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_stories_category_published_created ON stories(category, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_published_number ON chapters(story_id, chapter_number) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_story_id ON reading_history(story_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_story_last_read_at ON reading_history(story_id, last_read_at);
CREATE INDEX IF NOT EXISTS idx_user_chapter_reads_user_story ON user_chapter_reads(user_id, story_id);
CREATE INDEX IF NOT EXISTS idx_user_chapter_reads_chapter_id ON user_chapter_reads(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_user_id ON user_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_story_id ON user_follows(story_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON comments(story_id);
CREATE INDEX IF NOT EXISTS idx_comments_story_status_created ON comments(story_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_story_id ON ratings(story_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_story_collaborators_story_id ON story_collaborators(story_id);
CREATE INDEX IF NOT EXISTS idx_story_collaborators_user_id ON story_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_story_id ON notifications(story_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON audit_logs(actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Updated-at triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stories_updated_at ON stories;
CREATE TRIGGER trg_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chapters_updated_at ON chapters;
CREATE TRIGGER trg_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ratings_updated_at ON ratings;
CREATE TRIGGER trg_ratings_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- payout_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payout_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crystal_amount INTEGER NOT NULL CHECK (crystal_amount > 0),
    vnd_amount INTEGER NOT NULL CHECK (vnd_amount > 0),
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    admin_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_payout_requests_updated_at ON payout_requests;
CREATE TRIGGER trg_payout_requests_updated_at
    BEFORE UPDATE ON payout_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
