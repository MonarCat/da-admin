-- ============================================================
-- D.A DRIVE ASSISTANT — SUPABASE SCHEMA
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for geo queries (enable in Supabase Dashboard > Extensions first)

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE vehicle_status AS ENUM ('moving', 'parked', 'stalled', 'sos', 'offline');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'fleet', 'government');
CREATE TYPE command_type AS ENUM (
  'stop_engine',
  'start_engine',
  'activate_autopilot',
  'deactivate_autopilot',
  'lock_doors',
  'unlock_doors',
  'force_bluetooth',
  'disconnect_bluetooth',
  'play_music',
  'stop_music',
  'set_volume',
  'activate_alarm',
  'deactivate_alarm',
  'request_location',
  'enable_tracking',
  'disable_tracking',
  'broadcast_message',
  'sos_response',
  'immobilize',
  'release_immobilize'
);
CREATE TYPE command_status AS ENUM ('pending', 'delivered', 'acknowledged', 'executed', 'failed', 'timeout');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE user_role AS ENUM ('driver', 'fleet_manager', 'admin', 'super_admin', 'government');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'driver',
  organization  TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate             TEXT NOT NULL UNIQUE,
  owner_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  make              TEXT NOT NULL,
  model             TEXT,
  year              INTEGER,
  color             TEXT,
  vin               TEXT UNIQUE,
  subscription_tier subscription_tier DEFAULT 'free',
  is_active         BOOLEAN DEFAULT TRUE,
  registered_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLE TELEMETRY (real-time, updated frequently)
-- ============================================================
CREATE TABLE vehicle_telemetry (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  status          vehicle_status NOT NULL DEFAULT 'offline',
  lat             DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng             DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed           NUMERIC(6,2) DEFAULT 0,
  heading         NUMERIC(6,2) DEFAULT 0,
  fuel_level      NUMERIC(5,2) DEFAULT 0,
  engine_on       BOOLEAN DEFAULT FALSE,
  doors_locked    BOOLEAN DEFAULT TRUE,
  autopilot_on    BOOLEAN DEFAULT FALSE,
  bluetooth_active BOOLEAN DEFAULT FALSE,
  bluetooth_device TEXT,
  current_route   TEXT,
  mesh_hops       INTEGER DEFAULT 0,
  signal_strength INTEGER DEFAULT 0, -- dBm
  battery_voltage NUMERIC(5,2),
  engine_temp     NUMERIC(6,2),
  odometer        NUMERIC(10,2),
  altitude        NUMERIC(8,2),
  ip_address      TEXT,
  firmware_version TEXT DEFAULT '0.1.0',
  last_seen       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- One telemetry row per vehicle
CREATE UNIQUE INDEX idx_telemetry_vehicle ON vehicle_telemetry(vehicle_id);

-- ============================================================
-- LOCATION HISTORY
-- ============================================================
CREATE TABLE location_history (
  id          BIGSERIAL PRIMARY KEY,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  speed       NUMERIC(6,2),
  heading     NUMERIC(6,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_location_vehicle_time ON location_history(vehicle_id, recorded_at DESC);

-- Partition by time for performance (optional for v1)
-- Auto-delete history older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_location_history()
RETURNS void AS $$
BEGIN
  DELETE FROM location_history WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SOS EVENTS
-- ============================================================
CREATE TABLE sos_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  triggered_by    UUID REFERENCES profiles(id),
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  message         TEXT,
  severity        alert_severity DEFAULT 'critical',
  is_resolved     BOOLEAN DEFAULT FALSE,
  resolved_by     UUID REFERENCES profiles(id),
  resolved_at     TIMESTAMPTZ,
  response_notes  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sos_unresolved ON sos_events(is_resolved, created_at DESC);

-- ============================================================
-- VEHICLE COMMANDS (the heart of admin control)
-- ============================================================
CREATE TABLE vehicle_commands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  issued_by       UUID NOT NULL REFERENCES profiles(id),
  command_type    command_type NOT NULL,
  payload         JSONB DEFAULT '{}', -- e.g. { "track": "Bohemian Rhapsody", "volume": 80 }
  status          command_status DEFAULT 'pending',
  priority        INTEGER DEFAULT 5, -- 1=highest (immobilize), 10=lowest
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  executed_at     TIMESTAMPTZ,
  error_message   TEXT,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
  -- Audit
  ip_address      TEXT,
  user_agent      TEXT
);

CREATE INDEX idx_commands_vehicle_pending ON vehicle_commands(vehicle_id, status, issued_at DESC);
CREATE INDEX idx_commands_recent ON vehicle_commands(issued_at DESC);

-- ============================================================
-- MESSAGES (vehicle-to-vehicle + admin broadcast)
-- ============================================================
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_vehicle  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  to_vehicle    UUID REFERENCES vehicles(id) ON DELETE SET NULL, -- NULL = broadcast
  from_user     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  message_type  TEXT DEFAULT 'text', -- text | poke | sos | broadcast | admin
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_vehicle ON messages(to_vehicle, created_at DESC);

-- ============================================================
-- GEOFENCES
-- ============================================================
CREATE TABLE geofences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  created_by    UUID REFERENCES profiles(id),
  center_lat    DOUBLE PRECISION NOT NULL,
  center_lng    DOUBLE PRECISION NOT NULL,
  radius_meters NUMERIC(10,2) NOT NULL DEFAULT 1000,
  is_active     BOOLEAN DEFAULT TRUE,
  alert_on_enter BOOLEAN DEFAULT TRUE,
  alert_on_exit  BOOLEAN DEFAULT TRUE,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE geofence_vehicles (
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (geofence_id, vehicle_id)
);

CREATE TABLE geofence_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL, -- 'enter' | 'exit'
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (every admin action logged — critical for gov clients)
-- ============================================================
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT, -- 'vehicle' | 'command' | 'geofence' | 'user'
  target_id   TEXT,
  details     JSONB DEFAULT '{}',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_recent ON audit_log(created_at DESC);

-- ============================================================
-- NETWORK STATS (mesh health snapshots)
-- ============================================================
CREATE TABLE network_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  total_nodes     INTEGER DEFAULT 0,
  active_nodes    INTEGER DEFAULT 0,
  sos_count       INTEGER DEFAULT 0,
  avg_mesh_latency_ms NUMERIC(8,2),
  region          TEXT DEFAULT 'nairobi_metro',
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REAL-TIME: Enable Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles: users see their own; admins see all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government'))
);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Vehicles: owners see their own; admins/fleet/gov see all
CREATE POLICY "Owner sees own vehicles" ON vehicles FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Elevated roles see all vehicles" ON vehicles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government','fleet_manager'))
);
CREATE POLICY "Admins manage vehicles" ON vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government'))
);

-- Telemetry: live data — public read for active vehicles (drivers see own, admins see all)
CREATE POLICY "Driver sees own telemetry" ON vehicle_telemetry FOR SELECT USING (
  vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid())
);
CREATE POLICY "Elevated roles see all telemetry" ON vehicle_telemetry FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government','fleet_manager'))
);
CREATE POLICY "System can update telemetry" ON vehicle_telemetry FOR ALL USING (TRUE); -- service_role only

-- Commands: only admins/gov can insert; all can read their vehicle's commands
CREATE POLICY "Admins issue commands" ON vehicle_commands FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government'))
);
CREATE POLICY "Admins view all commands" ON vehicle_commands FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government'))
);
CREATE POLICY "Drivers see commands for their vehicles" ON vehicle_commands FOR SELECT USING (
  vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid())
);

-- SOS: anyone can create; admins resolve
CREATE POLICY "Anyone can create SOS" ON sos_events FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "All can read SOS" ON sos_events FOR SELECT USING (TRUE);
CREATE POLICY "Admins resolve SOS" ON sos_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government'))
);

-- Audit log: only admins can read
CREATE POLICY "Admins view audit log" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','government'))
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_telemetry_updated BEFORE UPDATE ON vehicle_telemetry
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-log location history from telemetry updates
CREATE OR REPLACE FUNCTION log_location_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if position changed meaningfully (>10m approx)
  IF (ABS(NEW.lat - OLD.lat) > 0.0001 OR ABS(NEW.lng - OLD.lng) > 0.0001) THEN
    INSERT INTO location_history(vehicle_id, lat, lng, speed, heading)
    VALUES (NEW.vehicle_id, NEW.lat, NEW.lng, NEW.speed, NEW.heading);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_location AFTER UPDATE ON vehicle_telemetry
  FOR EACH ROW EXECUTE FUNCTION log_location_history();

-- Auto-create telemetry row when vehicle registered
CREATE OR REPLACE FUNCTION create_default_telemetry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vehicle_telemetry(vehicle_id, lat, lng)
  VALUES (NEW.id, -1.2921, 36.8219); -- Default: Nairobi CBD
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vehicle_telemetry AFTER INSERT ON vehicles
  FOR EACH ROW EXECUTE FUNCTION create_default_telemetry();

-- ============================================================
-- REALTIME PUBLICATION
-- Enable Supabase Realtime on these tables
-- ============================================================
BEGIN;
  -- Drop existing publication if exists
  DROP PUBLICATION IF EXISTS supabase_realtime;

  -- Recreate with our tables
  CREATE PUBLICATION supabase_realtime FOR TABLE
    vehicle_telemetry,
    vehicle_commands,
    sos_events,
    messages,
    network_snapshots;
COMMIT;

-- ============================================================
-- SEED DATA — Sample vehicles for development
-- ============================================================
-- NOTE: Insert a profile first via Supabase Auth, then reference it below
-- These are placeholders — replace owner_id with real UUIDs after signup

INSERT INTO vehicles (plate, make, model, year, color, subscription_tier) VALUES
  ('KCA 001X', 'Toyota', 'Noah',     2019, 'Silver', 'premium'),
  ('KBZ 442K', 'Nissan', 'X-Trail',  2021, 'White',  'premium'),
  ('KDG 218A', 'Subaru', 'Forester', 2018, 'Black',  'free'),
  ('KCJ 731F', 'Toyota', 'Prado',    2020, 'Blue',   'fleet'),
  ('KDD 904C', 'Mazda',  'CX-5',     2022, 'Red',    'premium'),
  ('KBT 556M', 'Honda',  'CR-V',     2017, 'Grey',   'free'),
  ('KCF 882T', 'VW',     'Tiguan',   2023, 'White',  'fleet'),
  ('KDA 119P', 'Toyota', 'Hilux',    2020, 'Navy',   'government');
