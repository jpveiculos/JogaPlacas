import { PublicResultsBoard } from "@/components/results/public-results-board";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Resultados e ganhadores | JogaPlacas",
  description: "Consulte os resultados publicados das placas cinza e Mercosul e veja os prêmios confirmados.",
};

export default function ResultsPage() {
  return <PublicResultsBoard />;
}
