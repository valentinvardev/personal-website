-- Centinela: falla ruidosamente si el hardening no está aplicado.
--
-- Existe porque el modo de falla real de este sistema es silencioso: alguien
-- corre `db push` sin el `db:sql` de después, los CHECK desaparecen, y no pasa
-- nada visible hasta que una fila inválida ya está guardada y contaminó un
-- rollup. Este archivo convierte eso en un error inmediato.
--
-- Corre último en `npm run db:sql`.

DO $$
DECLARE
  faltantes text[] := ARRAY[]::text[];
  esperados text[] := ARRAY[
    'metric_scored_shape',
    'metric_kind_vocab',
    'metric_cadence_v1',
    'rollup_scoring_shape',
    'event_subject_shape',
    'rollup_count_positive'
  ];
  c text;
BEGIN
  FOREACH c IN ARRAY esperados LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c AND connamespace = 'panel'::regnamespace
    ) THEN
      faltantes := faltantes || c;
    END IF;
  END LOOP;

  IF array_length(faltantes, 1) > 0 THEN
    RAISE EXCEPTION 'panel: faltan constraints (%). Corré: npm run db:sql', array_to_string(faltantes, ', ');
  END IF;

  -- Las seis tablas del panel tienen que existir.
  IF (SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'panel' AND table_type = 'BASE TABLE') <> 6 THEN
    RAISE EXCEPTION 'panel: se esperaban 6 tablas, hay %',
      (SELECT count(*) FROM information_schema.tables
       WHERE table_schema = 'panel' AND table_type = 'BASE TABLE');
  END IF;

  RAISE NOTICE 'panel: hardening verificado (% constraints, 6 tablas)', array_length(esperados, 1);
END $$;
