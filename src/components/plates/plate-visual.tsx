type PlateFormat = "LEGACY" | "MERCOSUR";

export function PlateVisual({ format, value, placeholder = " ", label }: {
  format: PlateFormat; value?: string; placeholder?: string; label?: string;
}) {
  const shown = (value ?? "").trim() || placeholder;
  const legacy = format === "LEGACY";
  const description = label ?? (legacy ? "Placa cinza: " : "Placa Mercosul: ") + shown;
  return (
    <div className={legacy ? "plate-visual plate-legacy" : "plate-visual plate-mercosur"} role="img" aria-label={description}>
      <div className="plate-topline"><span>BRASIL</span>{!legacy && <span className="mercosur-flag" aria-hidden="true">✦</span>}</div>
      <div className="plate-characters">{shown}</div>
      <div className="plate-bottomline">{legacy ? "BR" : "MERCOSUL"}</div>
    </div>
  );
}
