CREATE TABLE maintenance_logs (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  do_id     uuid        NOT NULL REFERENCES dos(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id),
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON maintenance_logs (do_id, logged_at);
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own logs"
  ON maintenance_logs FOR ALL USING (auth.uid() = user_id);
