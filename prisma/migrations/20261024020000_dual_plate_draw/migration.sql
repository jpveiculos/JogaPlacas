-- The previous resultPlate field stored the existing Mercosur draw result.
-- Preserve those values as Mercosur results; never relabel them as gray-plate results.
ALTER TABLE "Round" RENAME COLUMN "resultPlate" TO "resultMercosurPlate";
ALTER TABLE "Round" ADD COLUMN "resultLegacyPlate" TEXT;
