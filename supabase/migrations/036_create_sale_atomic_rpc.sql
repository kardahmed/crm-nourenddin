-- ─── 036_create_sale_atomic_rpc.sql ─────────────────────────────────────────
-- Wrap the multi-step "create sale" flow in a single PL/pgSQL function so the
-- whole operation runs inside one Postgres transaction. Previously the
-- frontend issued 1 + N + M + 2 separate INSERT/UPDATE calls; if any failed
-- midway we left orphan sales without their schedules, amenities, history
-- entry, or with the client still on the wrong pipeline stage.

CREATE OR REPLACE FUNCTION public.create_sale_atomic(
  p_client_id        uuid,
  p_agent_id         uuid,
  p_project_id       uuid,
  p_units            jsonb,         -- [{unit_id, total_price, discount_type, discount_value, final_price}]
  p_financing_mode   financing_mode,
  p_delivery_date    date,
  p_internal_notes   text,
  p_schedules        jsonb,         -- [{installment_number, due_date, amount, description}]
  p_amenities        jsonb,         -- [{description, price}]
  p_history_title    text,
  p_history_metadata jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER  -- run with caller's RLS context
AS $$
DECLARE
  v_sale_id   uuid;
  v_sale_ids  uuid[] := ARRAY[]::uuid[];
  v_unit      jsonb;
BEGIN
  IF p_units IS NULL OR jsonb_typeof(p_units) <> 'array' OR jsonb_array_length(p_units) = 0 THEN
    RAISE EXCEPTION 'p_units must be a non-empty JSON array';
  END IF;

  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units) LOOP
    INSERT INTO sales (
      client_id, agent_id, project_id, unit_id,
      total_price, discount_type, discount_value, final_price,
      financing_mode, delivery_date, internal_notes
    )
    VALUES (
      p_client_id,
      p_agent_id,
      p_project_id,
      (v_unit->>'unit_id')::uuid,
      (v_unit->>'total_price')::numeric,
      NULLIF(v_unit->>'discount_type', '')::discount_type,
      COALESCE((v_unit->>'discount_value')::numeric, 0),
      (v_unit->>'final_price')::numeric,
      p_financing_mode,
      p_delivery_date,
      p_internal_notes
    )
    RETURNING id INTO v_sale_id;

    v_sale_ids := array_append(v_sale_ids, v_sale_id);

    IF p_schedules IS NOT NULL AND jsonb_array_length(p_schedules) > 0 THEN
      INSERT INTO payment_schedules (sale_id, installment_number, due_date, amount, description)
      SELECT
        v_sale_id,
        (s->>'installment_number')::int,
        (s->>'due_date')::date,
        (s->>'amount')::numeric,
        s->>'description'
      FROM jsonb_array_elements(p_schedules) s;
    END IF;

    IF p_amenities IS NOT NULL AND jsonb_array_length(p_amenities) > 0 THEN
      INSERT INTO sale_amenities (sale_id, description, price)
      SELECT
        v_sale_id,
        a->>'description',
        COALESCE((a->>'price')::numeric, 0)
      FROM jsonb_array_elements(p_amenities) a;
    END IF;
  END LOOP;

  UPDATE clients SET pipeline_stage = 'vente' WHERE id = p_client_id;

  INSERT INTO history (client_id, agent_id, type, title, metadata)
  VALUES (p_client_id, p_agent_id, 'sale', p_history_title, COALESCE(p_history_metadata, '{}'::jsonb));

  RETURN jsonb_build_object('sale_ids', to_jsonb(v_sale_ids));
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sale_atomic(
  uuid, uuid, uuid, jsonb, financing_mode, date, text, jsonb, jsonb, text, jsonb
) TO authenticated;
