ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

ALTER TABLE orders
    ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE customized_orders
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

ALTER TABLE customized_orders
    ALTER COLUMN client_id DROP NOT NULL;
