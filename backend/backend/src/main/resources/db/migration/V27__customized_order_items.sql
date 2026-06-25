CREATE TABLE IF NOT EXISTS customized_order_items (
    id UUID PRIMARY KEY,
    customized_order_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    CONSTRAINT fk_customized_order_items_customized_order
        FOREIGN KEY (customized_order_id) REFERENCES customized_orders(id)
        ON DELETE CASCADE
);

ALTER TABLE customized_orders
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

ALTER TABLE customized_orders
    ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

ALTER TABLE customized_orders
    ALTER COLUMN client_id DROP NOT NULL;
