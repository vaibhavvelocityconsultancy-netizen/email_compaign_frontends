import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Opportunity } from "@/lib/api";

export interface QuotationModuleRow {
  module: string;
  description: string;
  amount: number;
}

export interface QuotationTotals {
  subtotal: number;
  taxable: number;
  tax: number;
  total: number;
}

export function computeTotals(v: { modules: QuotationModuleRow[]; discount: number; tax_percentage: number; packing_charges: number }): QuotationTotals {
  const subtotal = v.modules.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const taxable = Math.max(0, subtotal - (Number(v.discount) || 0));
  const tax = (taxable * (Number(v.tax_percentage) || 0)) / 100;
  return { subtotal, taxable, tax, total: taxable + tax + (Number(v.packing_charges) || 0) };
}

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function QuotationModulesTable({ opportunities, disabled }: { opportunities: Opportunity[]; disabled: boolean }) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "modules", keyName: "fieldKey" });
  const opportunityId = watch("opportunity") as string;
  const rows = (watch("modules") ?? []) as QuotationModuleRow[];
  const opp = opportunities.find((o) => o.id === opportunityId);
  const moduleOptions = (opp?.modules ?? []).filter((m) => m.id);
  const totals = computeTotals({
    modules: rows,
    discount: watch("discount"),
    tax_percentage: watch("tax_percentage"),
    packing_charges: watch("packing_charges"),
  });

  const pickModule = (index: number, id: string) => {
    setValue(`modules.${index}.module`, id);
    const m = moduleOptions.find((x) => x.id === id);
    if (m) {
      if (!rows[index]?.description) setValue(`modules.${index}.description`, m.description);
      if (!rows[index]?.amount) setValue(`modules.${index}.amount`, m.estimatedCost ?? 0);
    }
  };

  return (
    <div className="col-span-full space-y-4">
      <section className="rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between gap-2 p-4">
          <h3 className="text-sm font-semibold">Modules</h3>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={disabled || !opp}
            title={opp ? "Add module" : "Select an opportunity first"}
            onClick={() => append({ module: "", description: "", amount: 0 })}
          >
            <Plus className="size-4" /> Add Module
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-y border-line text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2 font-medium">#</th>
                <th className="w-56 px-2 py-2 font-medium">Module</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="w-36 px-2 py-2 text-right font-medium">Amount</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {opp ? 'No modules added. Click "Add Module" to add modules.' : "Select an opportunity to add its modules."}
                  </td>
                </tr>
              )}
              {fields.map((f, i) => (
                <tr key={f.fieldKey} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      disabled={disabled}
                      value={rows[i]?.module ?? ""}
                      onChange={(e) => pickModule(i, e.target.value)}
                    >
                      <option value="">Select module</option>
                      {moduleOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.moduleName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2"><Input className="h-9" disabled={disabled} {...register(`modules.${i}.description`)} /></td>
                  <td className="px-2 py-2"><Input className="h-9 text-right" type="number" min={0} step="0.01" disabled={disabled} {...register(`modules.${i}.amount`, { valueAsNumber: true })} /></td>
                  <td className="px-2 py-2">
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" disabled={disabled} onClick={() => remove(i)} aria-label={`Remove module ${i + 1}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <Row label="Subtotal" value={money(totals.subtotal)} />
        <Row label="Taxable amount" value={money(totals.taxable)} />
        <Row label="Tax" value={money(totals.tax)} />
        <div className="flex justify-between border-t border-line pt-2 font-semibold">
          <span>Total</span><span className="font-mono">{money(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span><span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
