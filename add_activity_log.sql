CREATE TABLE public.activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    old_value JSONB NULL,
    new_value JSONB NULL,
    reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- Mengaktifkan RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for owner and super admin" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
