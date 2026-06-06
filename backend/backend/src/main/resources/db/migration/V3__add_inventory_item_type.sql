ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS item_type VARCHAR(100);

UPDATE inventory
SET item_type = COALESCE(item_type, 'Jersey')
WHERE item_type IS NULL;

ALTER TABLE inventory
ALTER COLUMN item_type SET NOT NULL,
ALTER COLUMN jersey_type DROP NOT NULL;
