-- Setup pgvector extension for PostgreSQL vector storage
-- This replaces the need for external Qdrant service

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create instruction_vectors table for storing instruction embeddings
CREATE TABLE IF NOT EXISTS instruction_vectors (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    embedding vector(384), -- 384 dimensions for text-embedding-3-small
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS instruction_vectors_embedding_idx 
ON instruction_vectors USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create ticket_vectors table for storing ticket embeddings
CREATE TABLE IF NOT EXISTS ticket_vectors (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for ticket vector similarity search
CREATE INDEX IF NOT EXISTS ticket_vectors_embedding_idx 
ON ticket_vectors USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_instruction_vectors_updated_at 
    BEFORE UPDATE ON instruction_vectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_vectors_updated_at 
    BEFORE UPDATE ON ticket_vectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON instruction_vectors TO your_app_user;
-- GRANT ALL PRIVILEGES ON ticket_vectors TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE instruction_vectors_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE ticket_vectors_id_seq TO your_app_user;