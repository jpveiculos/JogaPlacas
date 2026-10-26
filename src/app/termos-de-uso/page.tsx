import Link from "next/link";

export const metadata = {
  title: "Termos de uso | JogaPlacas",
  description: "Prazo de validade de compras, recibos e resgate de prêmios no JogaPlacas.",
};

export default function TermsPage() {
  return <main className="page-shell"><article className="feature-card terms-page">
    <span className="feature-label">Regras da plataforma</span>
    <h1>Termos de uso — prazo de validade de 7 dias</h1>
    <p><strong>Leia com atenção:</strong> compras, recibos e solicitações de resgate de prêmios estão sujeitos ao prazo de 7 (sete) dias descrito nesta seção.</p>
    <h2>1. Validade da compra e do recibo</h2>
    <p>O prazo de validade da compra é de 7 (sete) dias corridos, contados da data e hora em que a compra foi registrada no sistema. Até o fim desse prazo, o jogador pode consultar seu histórico e solicitar ao cambista ou à empresa uma segunda via do recibo de uma compra paga, desde que o pagamento esteja confirmado.</p>
    <p>Depois de completados 7 dias, o recibo deixa de estar disponível para consulta e impressão, inclusive para segunda via. O código antigo não pode ser usado para gerar outro recibo, e o sistema não permitirá reimprimir documentos vencidos.</p>
    <h2>2. Pagamentos pendentes</h2>
    <p>Fechar a janela do QR Code Pix não cancela nem confirma uma compra. A situação do pagamento deve ser confirmada pelo sistema. Uma compra pendente não dá direito a recibo de pagamento confirmado. O prazo de retenção do histórico, entretanto, continua contado a partir da criação da compra.</p>
    <h2>3. Prazo para resgate de prêmio</h2>
    <p>O jogador deve solicitar e concluir o resgate de eventual prêmio em até 7 (sete) dias corridos, contados da data e hora do resultado da rodada correspondente. Após esse prazo, o prêmio não resgatado perde a validade e não poderá ser solicitado por meio do cambista ou da empresa. Prêmios já creditados e efetivamente disponibilizados no saldo da conta antes do vencimento são registrados como crédito concluído.</p>
    <h2>4. Histórico e dados</h2>
    <p>O histórico de compras deixa de aparecer nas telas e pesquisas do sistema após 7 dias. Isso significa que ele não ficará disponível para consulta operacional ou reimpressão. A eliminação física de registros de bancos de dados, backups ou registros que precisem ser mantidos para prevenção a fraude, segurança, obrigações legais ou contábeis segue a política de retenção aplicável; não se promete apagamento imediato de cópias de segurança ou de registros cuja guarda seja exigida por lei.</p>
    <h2>5. Confirmação e suporte</h2>
    <p>O sistema só emite recibo oficial quando há confirmação de pagamento. O comprovante de pagamento e a situação do prêmio devem ser verificados nos registros oficiais do JogaPlacas. Em caso de dúvida, procure a empresa antes de terminar o prazo de 7 dias.</p>
    <p className="note-inline">A aplicação técnica destas regras deve respeitar a legislação aplicável e a revisão jurídica da operação.</p>
    <p><Link href="/login">Voltar para entrar</Link></p>
  </article></main>;
}
