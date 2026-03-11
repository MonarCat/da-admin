-- ================================================================
-- D.A — AUTH & USER MANAGEMENT SCHEMA (v2)
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- Run AFTER your initial schema
-- ================================================================

-- ── Extend profiles ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN   DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count      INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invited_by       UUID      REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS avatar_initials  TEXT,
  ADD COLUMN IF NOT EXISTS department       TEXT,
  ADD COLUMN IF NOT EXISTS badge_number     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS clearance_level  INTEGER   DEFAULT 1,  -- 1-10
  ADD COLUMN IF NOT EXISTS org_id           UUID;

-- ── Organizations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL DEFAULT 'fleet',
  -- fleet | government | law_enforcement | insurance | private
  country         TEXT DEFAULT 'KE',
  city            TEXT DEFAULT 'Nairobi',
  license_tier    TEXT DEFAULT 'fleet',
  -- fleet | authority | enterprise
  license_expiry  TIMESTAMPTZ,
  max_vehicles    INTEGER DEFAULT 50,
  max_admins      INTEGER DEFAULT 5,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ── Invitations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'driver',
  org_id      UUID REFERENCES organizations(id),
  invited_by  UUID NOT NULL REFERENCES profiles(id),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_used     BOOLEAN DEFAULT FALSE,
  used_by     UUID REFERENCES profiles(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Login sessions (audit) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address      TEXT,
  user_agent      TEXT,
  success         BOOLEAN DEFAULT TRUE,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON login_sessions(user_id, created_at DESC);

-- ── Vehicle assignments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id   UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by  UUID REFERENCES profiles(id),
  assignment_role TEXT DEFAULT 'driver',  -- driver | co-driver | fleet_manager
  is_active    BOOLEAN DEFAULT TRUE,
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, user_id)
);

-- ── Auto-create profile on signup ────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
  assigned_role TEXT := 'driver';
  assigned_org  UUID := NULL;
  clearance     INTEGER := 1;
BEGIN
  -- Check for matching invitation
  SELECT * INTO inv
  FROM invitations
  WHERE email = NEW.email
    AND is_used = FALSE
    AND expires_at > NOW()
  LIMIT 1;

  IF inv.id IS NOT NULL THEN
    assigned_role := inv.role;
    assigned_org  := inv.org_id;
  END IF;

  -- Map role to clearance level
  clearance := CASE assigned_role
    WHEN 'super_admin'   THEN 10
    WHEN 'government'    THEN 9
    WHEN 'admin'         THEN 5
    WHEN 'fleet_manager' THEN 3
    ELSE 1
  END;

  INSERT INTO profiles (
    id, full_name, phone, role, org_id,
    is_active, clearance_level, invited_by,
    avatar_initials
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    assigned_role,
    assigned_org,
    TRUE,
    clearance,
    inv.invited_by,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1))
  );

  -- Mark invitation used
  IF inv.id IS NOT NULL THEN
    UPDATE invitations SET
      is_used = TRUE,
      used_by = NEW.id,
      used_at = NOW()
    WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Track login events ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION track_login(
  p_user_id UUID,
  p_ip      TEXT DEFAULT NULL,
  p_agent   TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_reason  TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO login_sessions(user_id, ip_address, user_agent, success, failure_reason)
  VALUES (p_user_id, p_ip, p_agent, p_success, p_reason);

  IF p_success THEN
    UPDATE profiles SET
      last_login  = NOW(),
      login_count = COALESCE(login_count, 0) + 1
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "Elevated roles see orgs" ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin','government'))
);
CREATE POLICY "Fleet managers see own org" ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = organizations.id)
);
CREATE POLICY "Super admins manage orgs" ON organizations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('super_admin','government'))
);

-- Invitations
CREATE POLICY "Admins manage invitations" ON invitations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin','government'))
);

-- Login sessions
CREATE POLICY "Own sessions" ON login_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins see all sessions" ON login_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin','government'))
);

-- Assignments
CREATE POLICY "Own assignments" ON vehicle_assignments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage assignments" ON vehicle_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin','government','fleet_manager'))
);

-- ── Seed: D.A master org ─────────────────────────────────────────
INSERT INTO organizations (name, type, license_tier, max_vehicles, max_admins)
VALUES ('D.A Command', 'government', 'enterprise', 99999, 999)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- AFTER RUNNING THIS SQL:
-- 1. Sign up at your da-admin site (any email)
-- 2. Go to Supabase > Authentication > Users > copy your UUID
-- 3. Run this (replace YOUR-UUID):
--
-- UPDATE profiles SET
--   role = 'super_admin',
--   clearance_level = 10,
--   full_name = 'Moses Mwombe',
--   org_id = (SELECT id FROM organizations WHERE name = 'D.A Command')
-- WHERE id = 'YOUR-UUID-HERE';
-- ================================================================
