ALTER TABLE orders
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

ALTER TABLE customized_orders
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
