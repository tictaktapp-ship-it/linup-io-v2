ALTER TABLE linup_spend_log ADD COLUMN IF NOT EXISTS completion_tokens integer;
ALTER TABLE linup_spend_log ADD COLUMN IF NOT EXISTS model text;