ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_school VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city_municipality VARCHAR(255);

ALTER TABLE customized_orders ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
ALTER TABLE customized_orders ADD COLUMN IF NOT EXISTS company_school VARCHAR(255);
ALTER TABLE customized_orders ADD COLUMN IF NOT EXISTS city_municipality VARCHAR(255);
