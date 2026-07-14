ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uk_orders_request_fingerprint ON orders(request_fingerprint);

ALTER TABLE customized_orders ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(100);
ALTER TABLE customized_orders ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uk_customized_orders_request_fingerprint ON customized_orders(request_fingerprint);

ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(100);
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uk_employee_attendance_request_fingerprint ON employee_attendance(request_fingerprint);

ALTER TABLE users ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
