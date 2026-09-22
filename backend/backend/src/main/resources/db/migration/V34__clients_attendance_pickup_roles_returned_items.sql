-- V34: clients company/school + city, attendance AM/PM times, order pickup dates, returned items, extended roles

ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_school VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city_municipality VARCHAR(255);

ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS time_in_am TIME NULL;
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS time_out_am TIME NULL;
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS time_in_pm TIME NULL;
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS time_out_pm TIME NULL;
ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS day_type VARCHAR(20);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_date DATE NULL;
ALTER TABLE customized_orders ADD COLUMN IF NOT EXISTS pickup_date DATE NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('ADMIN', 'EMPLOYEE', 'MARKETING', 'PRODUCTION', 'SEWING', 'GRAPHIC_ARTISTS', 'SALES', 'MACHINE_OPERATORS'));

CREATE TABLE IF NOT EXISTS returned_items (
    id UUID PRIMARY KEY,
    order_id UUID NULL,
    customized_order_id UUID NULL,
    product_name VARCHAR(255),
    size VARCHAR(20),
    number VARCHAR(50),
    jersey_type VARCHAR(50),
    quantity INTEGER NOT NULL,
    reason TEXT,
    return_date DATE,
    request_fingerprint VARCHAR(100) UNIQUE,
    version BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_returned_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_returned_items_customized_order
        FOREIGN KEY (customized_order_id) REFERENCES customized_orders(id)
);