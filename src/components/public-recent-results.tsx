"use client";

import { useEffect, useState } from "react";
import { PlateVisual } from "@/components/plates/plate-visual";

type DrawResult = {
  id: string;
  code: string;
  resultAt: string;
  legacyPlate: string;
  mercosurPlate: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PublicRecentResults() {
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/public/results", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os resultados.");
        return body.results as DrawResult[];
      })
      .then((items) => { if (active) setResults(items); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar resultados.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <details className="home-public-results">
      <summary>
        <span>Últimos resultados</span>
        <span className="home-results-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="home-public-results-content">
        <p className="home-public-results-description">Sorteios concluídos nas últimas 24 horas.</p>
        {loading ? <p>Carregando resultados…</p>
          : error ? <p role="alert">{error}</p>
          : results.length === 0 ? <p>Ainda não há resultados publicados nas últimas 24 horas.</p>
          : <div className="home-public-results-list">
            {results.map((result) => (
              <article className="home-public-result" key={result.id}>
                <div className="home-public-result-heading">
                  <strong>Rodada {result.code}</strong>
                  <time dateTime={result.resultAt}>{formatDate(result.resultAt)}</time>
                </div>
                <div className="home-public-result-plates">
                  <div><span>Placa cinza</span><PlateVisual format="LEGACY" value={result.legacyPlate} /></div>
                  <div><span>Placa Mercosul</span><PlateVisual format="MERCOSUR" value={result.mercosurPlate} /></div>
                </div>
              </article>
            ))}
          </div>}
      </div>
    </details>
  );
}
