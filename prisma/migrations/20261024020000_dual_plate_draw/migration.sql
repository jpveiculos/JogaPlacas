-- Preserve any existing single result as the legacy-format result; add the independent Mercosur result.
ALTER TABLE "Round" RENAME COLUMN "resultPlate" TO "resultLegacyPlate";
ALTER TABLE "Round" ADD COLUMN "resultMercosurPlate" TEXT;
