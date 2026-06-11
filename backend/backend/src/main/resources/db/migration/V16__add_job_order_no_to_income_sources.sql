ALTER TABLE income_sources
ADD COLUMN IF NOT EXISTS job_order_no VARCHAR(50);
