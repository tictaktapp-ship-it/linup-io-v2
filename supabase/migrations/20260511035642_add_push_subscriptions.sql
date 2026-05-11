-- Phase 8: push_subscriptions
-- Stores browser PushSubscription objects (JSONB) per user.
-- One user may have multiple subscriptions (multiple browsers/devices).
-- Server (service role) manages all rows; users manage their own via API.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON push_subscriptions (user_id);

-- Unique per endpoint so duplicate registrations are not stored
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx
  ON push_subscriptions ((subscription->>'endpoint'));

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users read own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions (unsubscribe)
CREATE POLICY "Users delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);