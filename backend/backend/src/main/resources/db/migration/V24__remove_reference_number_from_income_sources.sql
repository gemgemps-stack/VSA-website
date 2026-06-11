-- Remove reference_number column from income_sources table
-- Reference numbers are now fetched from orders or customized_orders tables based on jobOrderNo

ALTER TABLE income_sources DROP COLUMN reference_number;
