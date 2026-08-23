import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { ORDER_STATUS, ORDER_TYPE } from "@/lib/constants";
import { formatDate, formatDateTime, formatPrice, toFaDigits } from "@/lib/utils";
import { getCustomerById } from "@/modules/admin/queries";

type Params = Promise<{ id: string }>;
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await getCustomerById(id);
  if (!data) notFound();

  const { customer, orders } = data;
  const totalValue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <>
      <AdminPageHeader
        breadcrumb={[{ label: "پنل", href: "/admin" }, { label: "مشتریان", href: "/admin/customers" }]}
        title={customer.fullName}
        description={`${toFaDigits(orders.length)} درخواست · مجموع ${formatPrice(totalValue)} · عضویت از ${formatDate(customer.createdAt)}`}
        actions={
          <a
            href={`tel:${customer.phone}`}
            className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)]"
          >
            تماس
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Panel title="تاریخچه درخواست‌ها" padded={false}>
          <DataTable head={["شماره", "نوع", "وضعیت", "مبلغ", "تاریخ"]} empty={orders.length === 0}>
            {orders.map((order) => (
              <Tr key={order.id}>
                <Td>
                  <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-[var(--brand)]" dir="ltr">
                    {order.number}
                  </Link>
                </Td>
                <Td><StatusBadge map={ORDER_TYPE} value={order.type} /></Td>
                <Td><StatusBadge map={ORDER_STATUS} value={order.status} /></Td>
                <Td className="whitespace-nowrap font-mono text-xs">
                  {order.total > 0 ? formatPrice(order.total, { withUnit: false }) : "—"}
                </Td>
                <Td className="whitespace-nowrap text-[0.6875rem] text-[var(--fg-subtle)]">{formatDateTime(order.createdAt)}</Td>
              </Tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="اطلاعات مشتری">
          <dl className="space-y-3 text-[0.8125rem]">
            {[
              ["نام", customer.fullName],
              ["تلفن", customer.phone],
              ["ایمیل", customer.email],
              ["نوع", customer.type === "COMPANY" ? "حقوقی" : "حقیقی"],
              ["شرکت", customer.companyName],
              ["کد اقتصادی", customer.economicCode],
              ["استان", customer.province],
              ["شهر", customer.city],
              ["کد پستی", customer.postalCode],
              ["آدرس", customer.address],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label as string} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-[0.6875rem] text-[var(--fg-subtle)]">{label}</dt>
                  <dd className="text-end text-[var(--fg-secondary)]">{value}</dd>
                </div>
              ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
