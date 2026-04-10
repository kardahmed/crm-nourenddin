-- ═══════════════════════════════════════════
-- Alternative 1: Pure SQL function (no Edge Function needed)
-- Run via pg_cron every hour
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_record RECORD;
  processed INTEGER := 0;
BEGIN
  FOR expired_record IN
    SELECT id, tenant_id, client_id, unit_id
    FROM reservations
    WHERE status = 'active' AND expires_at < NOW()
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
      'Réservation expirée — client passé en relancement',
      'Réservation ' || expired_record.id || ' expirée automatiquement',
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- Schedule with pg_cron (every hour at :00)
-- ═══════════════════════════════════════════

-- Enable pg_cron extension (run once as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job
-- SELECT cron.schedule(
--   'check-expired-reservations',
--   '0 * * * *',
--   'SELECT check_expired_reservations()'
-- );

-- To verify the schedule:
-- SELECT * FROM cron.job;

-- To remove the schedule:
-- SELECT cron.unschedule('check-expired-reservations');

-- ═══════════════════════════════════════════
-- Alternative 2: Call Edge Function via pg_cron + pg_net
-- ═══════════════════════════════════════════

-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- SELECT cron.schedule(
--   'check-reservations-edge',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reservations',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
