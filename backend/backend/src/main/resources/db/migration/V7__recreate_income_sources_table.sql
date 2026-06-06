DROP TABLE IF EXISTS income_sources CASCADE;

CREATE TABLE income_sources (
    id UUID PRIMARY KEY,
    shop_type VARCHAR(100) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    income_date DATE NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
