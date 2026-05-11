-- Phase 10: OAuth profile columns (Doc 11 D4 + D17)
-- auth_method: tracks how the user authenticated
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS auth_method TEXT
    CHECK (auth_method IN ('PASSWORD','GOOGLE','GITHUB'))
    DEFAULT 'PASSWORD';

-- oauth_provider_id: provider's own user ID for deduplication
-- Prevents same OAuth identity creating multiple LINUP orgs
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;

-- Index for fast dedup lookup on OAuth callback
CREATE INDEX IF NOT EXISTS idx_user_profiles_oauth_provider_id
  ON user_profiles(oauth_provider_id)
  WHERE oauth_provider_id IS NOT NULL;