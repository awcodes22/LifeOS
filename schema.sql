-- run this to setup db

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)        NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255)        NOT NULL, -- stored as a bcrypt hash
  created_at TIMESTAMPTZ         DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS journals (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255)  NOT NULL,
  content    TEXT          NOT NULL,
  mood       VARCHAR(20),  -- excellent, good, okay, bad, terrible
  created_at TIMESTAMPTZ   DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  priority    VARCHAR(10)   DEFAULT 'medium',
  completed   BOOLEAN       DEFAULT FALSE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);


-- duration is in minutes (25, 5, or 30)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  duration     INTEGER      NOT NULL,
  session_type VARCHAR(20)  DEFAULT 'focus',
  completed_at TIMESTAMPTZ  DEFAULT NOW()
);
