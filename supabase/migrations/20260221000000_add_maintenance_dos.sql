CREATE TYPE do_type AS ENUM ('normal', 'maintenance');

ALTER TABLE dos
  ADD COLUMN do_type          do_type  NOT NULL DEFAULT 'normal',
  ADD COLUMN completion_count integer  NOT NULL DEFAULT 0;
