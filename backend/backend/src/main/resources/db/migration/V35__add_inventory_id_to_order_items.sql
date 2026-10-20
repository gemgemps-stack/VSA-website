ALTER TABLE order_items ADD COLUMN IF NOT EXISTS inventory_id UUID;
ALTER TABLE customized_order_items ADD COLUMN IF NOT EXISTS inventory_id UUID;