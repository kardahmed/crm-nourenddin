-- ═══════════════════════════════════════════
-- SQL function: mark overdue payments as late
-- Run via pg_cron daily at 9:00 AM
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_overdue_payments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark all pending payments past due date as late
  WITH late_payments AS (
    UPDATE payment_schedules
    SET status = 'late'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
    RETURNING id, tenant_id, sale_id, amount, due_date, installment_number
  )
  SELECT COUNT(*) INTO updated_count FROM late_payments;

  RAISE NOTICE 'Marked % payment(s) as late', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- Schedule: daily at 9:00 AM
-- ═══════════════════════════════════════════

-- SELECT cron.schedule(
--   'check-overdue-payments',
--   '0 9 * * *',
--   'SELECT check_overdue_payments()'
-- );
