-- Add foreign key constraint from income_sources to clients
ALTER TABLE income_sources
ADD CONSTRAINT fk_income_sources_client_id
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
