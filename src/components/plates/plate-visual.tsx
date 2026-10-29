type PlateFormat = "LEGACY" | "MERCOSUR";

export function PlateVisual({ format, value, label }: {
  format: PlateFormat; value?: string; placeholder?: string; label?: string;
}) {
  const shown = (value ?? "").trim();
  const legacy = format === "LEGACY";
  const description = label ?? (legacy ? "Placa cinza" : "Placa Mercosul") + (shown ? ": " + shown : " vazia");
  const image = legacy ? "/images/plates/placa-cinza.PNG" : "/images/plates/placa-mercosul.png";

  return (
    <div className={legacy ? "plate-visual plate-image plate-legacy" : "plate-visual plate-image plate-mercosur"} role="img" aria-label={description}>
      <img className="plate-image-art" src={image} alt="" aria-hidden="true" />
      <span className="plate-blank-area" aria-hidden="true" />
      <span className="plate-characters">{shown}</span>
    </div>
  );
}
