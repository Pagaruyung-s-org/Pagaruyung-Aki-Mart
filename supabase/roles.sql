-- ============================================================
-- 1. USER ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'OWNER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS Policies (Allow all for now since we use Server Actions for secure operations)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_all" ON user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_insert_all" ON user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "user_roles_update_all" ON user_roles FOR UPDATE USING (true);
CREATE POLICY "user_roles_delete_all" ON user_roles FOR DELETE USING (true);

-- Trigger to auto-assign SUPER_ADMIN to the very first user created, and ADMIN to subsequent users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'SUPER_ADMIN');
  ELSE
    -- Default role if not explicitly created via our App (e.g. from Dashboard)
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'ADMIN');
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent duplicate errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();



