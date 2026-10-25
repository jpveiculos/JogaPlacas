"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlateVisual } from "@/components/plates/plate-visual";

type DrawResult = { id: string; code: string; resultAt: string; legacyPlate: string; mercosurPlate: string };
type Winner = { id: string; displayName: string; plateFormat: "LEGACY" | "MERCOSUR"; plateDisplay: string; prizeCents: number; roundCode: string; resultAt: string };
type ResultsPayload = { results: DrawResult[]; nextBefore: string | null; winners: Winner[]; generatedAt: string; winnersWindowDays: number };

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function PublicResultsBoard() {
  const [results, setResults] = useState<DrawResult[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const nextBeforeRef = useRef<string | null>(null);

  const load = useCallback(async (older = false) => {
    if (older) setLoadingMore(true);
    else setError("");
    try {
      const cursor = nextBeforeRef.current;
      const query = older && cursor ? "?before=" + encodeURIComponent(cursor) : "";
      const response = await fetch("/api/public/results" + query, { cache: "no-store" });
      const body = await response.json() as ResultsPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os resultados.");
      setResults((current) => {
        const existing = new Set(current.map((item) => item.id));
        if (older) return [...current, ...body.results.filter((item) => !existing.has(item.id))];
        return [...body.results, ...current.filter((item) => !existing.has(item.id))];
      });
      if (older || !nextBeforeRef.current) {
        nextBeforeRef.current = body.nextBefore;
        setNextBefore(body.nextBefore);
      }
      if (!older) setWinners(body.winners);
      setUpdatedAt(body.generatedAt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao carregar resultados.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className="public-results-page">
      <header className="public-results-header">
        <div className="public-results-brand">Joga<span>Placas</span></div>
        <div className="public-results-title-row">
          <div><p className="public-results-eyebrow">Resultados oficiais publicados</p><h1>Resultados</h1></div>
          <div className="live-indicator"><span /> AO VIVO</div>
        </div>
        <p className="public-results-subtitle">Placas cinza e Mercosul — sorteios independentes.</p>
      </header>
      <section className="public-results-main" aria-labelledby="public-results-heading">
        <div className="public-section-heading"><h2 id="public-results-heading">Histórico de resultados</h2><span>{results.length} resultados carregados</span></div>
        {loading ? <p className="public-state">Carregando resultados…</p> : error && results.length === 0 ? <p className="public-state" role="alert">{error}</p> : results.length === 0 ? (
          <p className="public-state">Ainda não há resultados publicados.</p>
        ) : (
          <div className="public-results-list">
            {results.map((result) => (
              <article className="public-result-row" key={result.id}>
                <div className="public-result-date"><strong>{dateLabel(result.resultAt)}</strong><time dateTime={result.resultAt}>{dateTime(result.resultAt)}</time></div>
                <div className="public-result-round">Rodada <strong>{result.code}</strong></div>
                <div className="public-result-plates">
                  <div className="public-result-plate"><span>CINZA</span><PlateVisual format="LEGACY" value={result.legacyPlate} /></div>
                  <div className="public-result-plate"><span>MERCOSUL</span><PlateVisual format="MERCOSUR" value={result.mercosurPlate} /></div>
                </div>
              </article>
            ))}
          </div>
        )}
        {error && results.length > 0 && <p className="public-state" role="status">{error}</p>}
        {nextBefore && <button className="public-load-more" disabled={loadingMore} onClick={() => void load(true)}>{loadingMore ? "Carregando…" : "Carregar resultados anteriores"}</button>}
        {updatedAt && <p className="public-updated">Atualizado às {dateTime(updatedAt)} · atualização automática a cada 15 segundos</p>}
      </section>
      <section className="public-winners-section" aria-labelledby="public-winners-heading">
        <div className="public-section-heading"><h2 id="public-winners-heading">Ganhadores</h2><span>Prêmios confirmados · últimos 30 dias</span></div>
        {winners.length === 0 ? <p className="public-winners-empty">Assim que houver prêmios confirmados, os ganhadores aparecerão aqui.</p> : (
          <div className="public-winners-strip">
            {winners.map((winner) => (
              <article className="public-winner-card" key={winner.id}>
                <div className="winner-medal" aria-hidden="true">★</div>
                <div className="winner-name">{winner.displayName}</div>
                <div className="winner-award">{money(winner.prizeCents)}</div>
                <div className="winner-round">Rodada {winner.roundCode} · {dateLabel(winner.resultAt)}</div>
                <PlateVisual format={winner.plateFormat} value={winner.plateDisplay} />
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="public-results-footer">JogaPlacas · Resultados publicados e prêmios confirmados</footer>
    </main>
  );
}
