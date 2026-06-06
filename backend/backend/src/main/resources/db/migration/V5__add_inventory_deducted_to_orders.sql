ALTER TABLE orders
ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE orders
SET inventory_deducted = FALSE
WHERE inventory_deducted IS NULL;
