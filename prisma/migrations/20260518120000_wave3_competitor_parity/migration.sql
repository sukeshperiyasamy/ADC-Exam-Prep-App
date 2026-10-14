-- NEUTRALIZED — intentional no-op.
--
-- This migration originally inserted the Wave 3 competitor-parity catalog
-- (36 bundles / 109 exams / 7,085 questions) generated from a local DB.
-- It was discovered BEFORE this migration ever applied to any environment
-- that production already contains all 36 of those bundles (identical
-- slugs, equivalent specs), built independently. Running the original
-- INSERT/UPSERT/DELETE statements on prod would have overwritten and
-- duplicated live, in-use catalog content.
--
-- The original SQL was therefore replaced with this no-op so that
-- `prisma migrate deploy` records the migration as applied without
-- mutating any data. The migration was never applied anywhere, so there
-- is no checksum/history conflict.
--
-- The full Wave 3 content remains intact in the local DB and on the
-- `catalog/wave3-competitor-parity` branch for reference; it is simply
-- redundant on production and must not be re-applied here.

SELECT 1;
