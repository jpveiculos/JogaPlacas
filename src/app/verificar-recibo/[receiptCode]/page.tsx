import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptVerification } from "@/components/receipts/receipt-verification";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verificação de recibo | Joga Placas",
  description: "Verifique no sistema oficial do Joga Placas se um recibo está registrado e se o pagamento foi confirmado.",
};

type PageProps = { params: Promise<{ receiptCode: string }> };

export default async function VerifyReceiptPage({ params }: PageProps) {
  const { receiptCode } = await params;
  return (
    <main className="home-page" style={{ minHeight: "100vh", padding: "32px 16px" }}>
      <header className="home-header">
        <Link href="/" className="home-brand" aria-label="Joga Placas — página inicial">
          <img src="/images/brand/joga-placa-logo.jpg" alt="Joga Placas" />
        </Link>
      </header>
      <section className="home-ticket-section" style={{ maxWidth: 720, margin: "32px auto" }}>
        <div className="home-section-intro">
          <p className="home-eyebrow">Consulta oficial</p>
          <h1>Verificação de recibo</h1>
          <p>Esta página consulta diretamente o registro oficial. Compare o código, o valor e as placas abaixo com o recibo impresso.</p>
        </div>
        <ReceiptVerification receiptCode={receiptCode} />
        <p style={{ marginTop: 24 }}><Link href="/">Voltar à página inicial do Joga Placas</Link></p>
      </section>
    </main>
  );
}
