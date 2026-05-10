-- Phase 7: Payments & MEC tables
-- Source: Doc 4 'Additional tables required' + 'MEC' section

-- Add is_first_free_project flag to projects (denormalised for fast lookup)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_first_free_project BOOLEAN DEFAULT FALSE;

-- Track per-artifact payments for free-tier users
CREATE TABLE IF NOT EXISTS artifact_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  amount_gbp DECIMAL(8,2) NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEC agreement per project (Stripe Connect platform disclosure + linkage)
CREATE TABLE IF NOT EXISTS mec_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ NOT NULL,
  acknowledged_ip TEXT,
  stripe_connected_account_id TEXT,
  mec_status TEXT CHECK (mec_status IN ('DISCLOSED','CONNECTED','LIVE','INACTIVE')) DEFAULT 'DISCLOSED',
  application_fee_percent DECIMAL(4,2) DEFAULT 1.50,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEC revenue event log (idempotent via stripe_event_id UNIQUE)
CREATE TABLE IF NOT EXISTS mec_revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mec_agreement_id UUID REFERENCES mec_agreements(id),
  stripe_charge_id TEXT NOT NULL,
  gross_amount_gbp DECIMAL(10,2) NOT NULL,
  application_fee_gbp DECIMAL(10,4) NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: artifact_payments — users see only their own rows
ALTER TABLE artifact_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifact_payments_owner ON artifact_payments
  FOR ALL USING (user_id = auth.uid());

-- RLS: mec_agreements — users see only their own rows
ALTER TABLE mec_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY mec_agreements_owner ON mec_agreements
  FOR ALL USING (user_id = auth.uid());

-- RLS: mec_revenue_events — no direct client access (server role only)
ALTER TABLE mec_revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY mec_revenue_events_deny_all ON mec_revenue_events
  FOR ALL USING (FALSE);