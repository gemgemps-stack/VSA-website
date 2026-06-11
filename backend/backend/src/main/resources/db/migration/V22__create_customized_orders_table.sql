CREATE TABLE IF NOT EXISTS customized_orders (
    id UUID PRIMARY KEY,
    job_order_no VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL,
    team_name VARCHAR(255),
    order_retail VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    freebie VARCHAR(255),
    discount NUMERIC(12, 2),
    price NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2),
    shop VARCHAR(100) NOT NULL,
    order_date DATE NOT NULL,
    mode_of_payment VARCHAR(50) NOT NULL,
    remarks TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customized_orders_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
);

