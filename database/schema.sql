CREATE TABLE users(
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
phone_number VARCHAR(15) UNIQUE NOT NULL,
password_hash VARCHAR(255) NOT NULL,
nin_encrypted TEXT,
full_name VARCHAR(100) NOT NULL,
is_verified BOOLEAN DEFAULT FALSE,
is_active BOOLEAN DEFAULT TRUE,
role VARCHAR(20) DEFAULT 'user',
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sos_events (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
threat_type VARCHAR(20) NOT NULL CHECK (threat_type IN ('ARMED', 'UNARMED')),
protocol VARCHAR(25) NOT NULL CHECK (protocol IN ('OBSERVATION', 'INTERVENTION')),
location GEOMETRY(POINT, 4326) NOT NULL,
address TEXT,
status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'CANCELLED')),
evidence_urls TEXT[],
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE responders (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
sos_event_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
status VARCHAR(20) DEFAULT 'NOTIFIED' CHECK (status IN ('NOTIFIED', 'ACCEPTED', 'DECLINED', 'ARRIVED')),
notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
responded_at TIMESTAMP WITH TIME ZONE,
UNIQUE (sos_event_id, responder_id)
);

CREATE TABLE geofences (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
guardian_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
ward_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
name VARCHAR(100) NOT NULL,
center GEOMETRY(POINT, 4326) NOT NULL,
radius_meters INTEGER NOT NULL,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE heartbeat_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
sos_event_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
location GEOMETRY(POINT, 4326) NOT NULL,
recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(15) NOT NULL,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contact_phone)
);

CREATE INDEX idx_sos_events_location ON sos_events USING GIST(location);
CREATE INDEX idx_geofences_center ON geofences USING GIST(center);
CREATE INDEX idx_heartbeat_logs_location ON heartbeat_logs USING GIST(location);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_sos_events_user_id ON sos_events(user_id);
CREATE INDEX idx_sos_events_status ON sos_events(status);
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);