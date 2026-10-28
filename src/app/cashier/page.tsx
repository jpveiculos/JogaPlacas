import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
import { QuickTicketCheck } from "@/components/results/quick-ticket-check";
import { CashierPurchaseHistory } from "@/components/cashier/cashier-purchase-history";
import { CashierSaleForm } from "@/components/cashier/cashier-sale-form";
import { CashierSalesSummary } from "@/components/cashier/cashier-sales-summary";
export const dynamic = "force-dynamic";
export default async function CashierPage() {
  const user = await requireRole("CASHIER");
  return <AreaShell title="Área do cambista" username={user.username}>
    <CashierSalesSummary />
    <CashierSaleForm />
    <QuickTicketCheck compact />
    <CashierPurchaseHistory />
  </AreaShell>;
}
