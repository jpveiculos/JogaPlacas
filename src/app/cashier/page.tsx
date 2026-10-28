import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
import { CashierSaleForm } from "@/components/cashier/cashier-sale-form";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  const user = await requireRole("CASHIER");
  return (
    <AreaShell title="Área do cambista" username={user.username} compact>
      <CashierSaleForm />
    </AreaShell>
  );
}
