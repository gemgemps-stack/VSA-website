ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);

UPDATE income_sources
SET team_name = (
    SELECT o.team_name
    FROM orders o
    WHERE o.job_order_no = income_sources.job_order_no
)
WHERE team_name IS NULL
  AND job_order_no IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.job_order_no = income_sources.job_order_no
        AND o.team_name IS NOT NULL
  );

UPDATE income_sources
SET team_name = (
    SELECT co.team_name
    FROM customized_orders co
    WHERE co.job_order_no = income_sources.job_order_no
)
WHERE team_name IS NULL
  AND job_order_no IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM customized_orders co
      WHERE co.job_order_no = income_sources.job_order_no
        AND co.team_name IS NOT NULL
  );
