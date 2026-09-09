-- Hardening del schema `panel`: lo que Prisma no puede expresar.
--
-- Este archivo es IDEMPOTENTE y se reaplica después de cada `db push`, porque
-- `db push` recrea el schema a imagen de schema.prisma y no sabe nada de esto.
-- Medido contra esta misma base: los CHECK y los triggers SOBREVIVEN al push,
-- pero un índice creado a mano lo borra en silencio. Por eso acá no hay ni un
-- índice: todos se declaran en schema.prisma.
--
-- Se corre con `npm run db:sql` (o encadenado en `npm run db:sync`).

-- ---------------------------------------------------------------------------
-- 1. Aislamiento del schema
-- ---------------------------------------------------------------------------
-- Supabase expone una API REST automática (PostgREST) y la publishable key
-- viaja al browser en el sitio público. Hoy solo `public` y `graphql_public`
-- están expuestos, así que `panel` es inalcanzable por diseño. Estos REVOKE
-- son la segunda línea: si alguien agrega `panel` a Exposed schemas por error,
-- los roles anónimos siguen sin poder leer nada.
--
-- `panel` NUNCA se agrega a Settings > API > Exposed schemas.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA panel FROM anon;
    REVOKE ALL ON ALL TABLES IN SCHEMA panel FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA panel REVOKE ALL ON TABLES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA panel FROM authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA panel FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA panel REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Constraints de forma
-- ---------------------------------------------------------------------------
-- La forma de una fila depende de su tipo, y Prisma no modela eso. Sin estos
-- CHECK, el primer update parcial mete una fila inválida y el sistema empieza
-- a mentir con formato de dato duro.
DO $$
BEGIN
  -- Un sujeto puntuado necesita target; uno no puntuado (el ánimo) no puede
  -- tenerlo. Spec §5.4.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'metric_scored_shape' AND connamespace = 'panel'::regnamespace
  ) THEN
    ALTER TABLE panel."Metric" ADD CONSTRAINT metric_scored_shape CHECK (
      (scored AND "targetValue" IS NOT NULL) OR (NOT scored AND "targetValue" IS NULL)
    );
  END IF;

  -- Vocabulario cerrado: un typo en `kind` no puede convertirse en datos.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'metric_kind_vocab' AND connamespace = 'panel'::regnamespace
  ) THEN
    ALTER TABLE panel."Metric" ADD CONSTRAINT metric_kind_vocab CHECK (
      kind IN ('habit', 'checkin')
    );
  END IF;

  -- v1 solo maneja cadencia diaria. Un hábito semanal generaría hit:false los
  -- siete días y la adherencia toparía en 57% con el hábito cumplido.
  -- Se relaja en v2, junto con la lógica de ventana semanal.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'metric_cadence_v1' AND connamespace = 'panel'::regnamespace
  ) THEN
    ALTER TABLE panel."Metric" ADD CONSTRAINT metric_cadence_v1 CHECK (cadence = 'daily');
  END IF;

  -- target y hit van juntos o no van: una fila con target y sin hit (o al
  -- revés) es un rollup a medio computar que después se lee como dato.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rollup_scoring_shape' AND connamespace = 'panel'::regnamespace
  ) THEN
    ALTER TABLE panel."DailyRollup" ADD CONSTRAINT rollup_scoring_shape CHECK (
      (target IS NULL) = (hit IS NULL)
    );
  END IF;

  -- subjectId con namespace declarado. La misma regex vive en
  -- src/server/panel/subject.ts; ésta es la red de seguridad para cualquier
  -- escritura que no pase por ahí (una corrección a mano, un import).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_subject_shape' AND connamespace = 'panel'::regnamespace
  ) THEN
    ALTER TABLE panel."Event" ADD CONSTRAINT event_subject_shape CHECK (
      "subjectId" IS NULL OR "subjectId" ~ '^(metric|repo):[A-Za-z0-9_./-]{1,80}$'
    );
  END IF;

  -- El contador de un rollup no puede ser negativo.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rollup_count_positive' AND connamespace = 'panel'::regnamespace
  ) THEN
    ALTER TABLE panel."DailyRollup" ADD CONSTRAINT rollup_count_positive CHECK ("count" >= 0);
  END IF;
END $$;

-- NOTA: no hay trigger de inmutabilidad sobre Event. La spec lo pide para
-- `dueAt` y `estimateDays` de los objetivos (v3), no para los eventos. Con
-- occurredAt inmutable no se podría corregir un check-in de sueño mal
-- cargado, que es el flujo más frecuente del v1.
