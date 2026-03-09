-- 002_create_shippers.sql
CREATE TABLE IF NOT EXISTS shippers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    tax_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_shippers_user_id ON shippers(user_id);
