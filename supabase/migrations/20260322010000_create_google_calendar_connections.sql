CREATE TABLE google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text,
  -- The stable Google account subject/user id returned by Google's userinfo endpoint.
  -- This is distinct from email and is safer to use as an identity field if needed later.
  google_subject text,
  access_token text NOT NULL,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
