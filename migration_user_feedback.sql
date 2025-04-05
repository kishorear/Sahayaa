-- Create the user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tenant_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comments TEXT,
  source VARCHAR(50) NOT NULL,
  session_id VARCHAR(255),
  ticket_id INTEGER,
  metadata JSONB DEFAULT '{}',
  user_email VARCHAR(255),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER,
  resolved_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create an index for faster lookup by tenant_id
CREATE INDEX IF NOT EXISTS user_feedback_tenant_id_idx ON user_feedback(tenant_id);

-- Create an index for faster lookup by session_id
CREATE INDEX IF NOT EXISTS user_feedback_session_id_idx ON user_feedback(session_id);

-- Create an index for faster lookup by ticket_id
CREATE INDEX IF NOT EXISTS user_feedback_ticket_id_idx ON user_feedback(ticket_id);

-- Add a comment to the table
COMMENT ON TABLE user_feedback IS 'Stores user feedback on support interactions';