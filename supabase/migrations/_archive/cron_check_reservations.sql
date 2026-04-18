-- ================================================
-- SQL function: expire active reservations past deadline
-- Run via pg_cron every hour
-- ================================================

CREATE OR REPLACE FUNCTION check_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_record RECORD;
  processed INTEGER := 0;
BEGIN
  -- Use FOR UPDATE to prevent concurrent processing
  FOR expired_record IN
    SELECT id, tenant_id, client_id, unit_id
    FROM reservations
    WHERE status = 'active' AND expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- a. Expire the reservation
    UPDATE reservations SET status = 'expired' WHERE id = expired_record.id;

    -- b. Free the unit
    UPDATE units
    SET status = 'available', client_id = NULL
    WHERE id = expired_record.unit_id AND status = 'reserved';

    -- c. Log history
    INSERT INTO history (tenant_id, client_id, agent_id, type, title, description, metadata)
    VALUES (
      expired_record.tenant_id,
      expired_record.client_id,
      NULL,
      'stage_change',
      'Reservation expiree -- client passe en relancement',
      'Reservation ' || expired_record.id || ' expiree automatiquement',
      jsonb_build_object(
        'reservation_id', expired_record.id,
        'unit_id', expired_record.unit_id,
        'from', 'reservation',
        'to', 'relancement',
        'auto', true
      )
    );

    -- d. Move client to relancement (only if still in reservation stage)
    UPDATE clients
    SET pipeline_stage = 'relancement'
    WHERE id = expired_record.client_id AND pipeline_stage = 'reservation';

    processed := processed + 1;
  END LOOP;

  RAISE NOTICE 'Processed % expired reservations', processed;
  RETURN processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ================================================
-- Schedule with pg_cron (every hour at :00)
-- ================================================

-- Enable pg_cron extension (run once as superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job
SELECT cron.schedule(
  'check-expired-reservations',
  '0 * * * *',
  'SELECT check_expired_reservations()'
);
