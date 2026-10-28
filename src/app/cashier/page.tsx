import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
import { CashierPurchaseHistory } from "@/components/cashier/cashier-purchase-history";
import { CashierSaleForm } from "@/components/cashier/cashier-sale-form";
import { CashierSalesSummary } from "@/components/cashier/cashier-sales-summary";
export const dynamic = "force-dynamic";
export default async function CashierPage() {
  const user = await requireRole("CASHIER");
  return <AreaShell title="Área do cambista" username={user.username} compact>
    <CashierSalesSummary />
    <CashierSaleForm />
    <CashierPurchaseHistory />
  </AreaShell>;
}
