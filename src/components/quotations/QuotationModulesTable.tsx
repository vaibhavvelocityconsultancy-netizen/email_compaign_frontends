import { useFieldArray, useFormContext } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Opportunity } from "@/lib/api";

export interface QuotationModuleRow {
  module: string | null;
  module_name: string;
  description: string;
  requirements: string;
  estimated_cost: number;
  estimated_days: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  remarks: string;
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
  const [moduleDrawerIndex, setModuleDrawerIndex] = useState<number | null>(null);
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
    setValue(`modules.${index}.module`, id || null);
    const m = moduleOptions.find((x) => x.id === id);
    if (m) {
      setValue(`modules.${index}.module_name`, m.moduleName);
      if (!rows[index]?.description) setValue(`modules.${index}.description`, m.description);
      if (!rows[index]?.requirements) setValue(`modules.${index}.requirements`, m.requirements);
      if (!rows[index]?.estimated_cost) setValue(`modules.${index}.estimated_cost`, m.estimatedCost ?? 0);
      if (!rows[index]?.estimated_days) setValue(`modules.${index}.estimated_days`, m.estimatedDays ?? 0);
      setValue(`modules.${index}.priority`, m.priority);
      if (!rows[index]?.amount) setValue(`modules.${index}.amount`, m.estimatedCost ?? 0);
    }
  };

  return (
    <div className="col-span-full space-y-4">
      <section className="rounded-lg border border-line bg-surface">
        <div className="flex i
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        +tems-center justify-between gap-2 p-4">
          <h3 className="text-sm font-semibold">Modules</h3>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            title="Add module"
            onClick={() => {
              const nextIndex = fields.length;
              append({
              module: null,
              module_name: "",
              description: "",
              requirements: "",
              estimated_cost: 0,
              estimated_days: 0,
              priority: "MEDIUM",
              remarks: "",
              amount: 0,
              });
              setModuleDrawerIndex(nextIndex);
            }}
          >
            <Plus className="size-4" /> Add Module
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-y border-line text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2 font-medium">#</th>
                <th className="w-48 px-2 py-2 font-medium">Source module</th>
                <th className="w-56 px-2 py-2 font-medium">Module name</th>
                <th className="w-56 px-2 py-2 font-medium">Description</th>
                <th className="w-56 px-2 py-2 font-medium">Requirements</th>
                <th className="w-28 px-2 py-2 font-medium">Cost</th>
                <th className="w-24 px-2 py-2 font-medium">Days</th>
                <th className="w-28 px-2 py-2 font-medium">Priority</th>
                <th className="w-36 px-2 py-2 font-medium">Remarks</th>
                <th className="w-36 px-2 py-2 text-right font-medium">Amount</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No modules added. Click "Add Module" to create a custom quotation module.
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
                      <option value="">Custom module</option>
                      {moduleOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.moduleName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2"><Input className="h-9" disabled={disabled} placeholder="Module name" {...register(`modules.${i}.module_name`)} /></td>
                  <td className="px-2 py-2"><Input className="h-9" disabled={disabled} {...register(`modules.${i}.description`)} /></td>
                  <td className="px-2 py-2"><Input className="h-9" disabled={disabled} {...register(`modules.${i}.requirements`)} /></td>
                  <td className="px-2 py-2"><Input className="h-9 text-right" type="number" min={0} step="0.01" disabled={disabled} {...register(`modules.${i}.estimated_cost`, { valueAsNumber: true })} /></td>
                  <td className="px-2 py-2"><Input className="h-9" type="number" min={0} step={1} disabled={disabled} {...register(`modules.${i}.estimated_days`, { valueAsNumber: true })} /></td>
                  <td className="px-2 py-2"><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" disabled={disabled} {...register(`modules.${i}.priority`)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></td>
                  <td className="px-2 py-2"><Input className="h-9" disabled={disabled} {...register(`modules.${i}.remarks`)} /></td>
                  <td className="px-2 py-2"><Input className="h-9 text-right" type="number" min={0} step="0.01" disabled={disabled} {...register(`modules.${i}.amount`, { valueAsNumber: true })} /></td>
                  <td className="px-2 py-2">
                    <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => setModuleDrawerIndex(i)} aria-label={`Edit module ${i + 1}`} title="Edit module">
                      <Pencil className="size-4" />
                    </Button>
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

      {moduleDrawerIndex !== null && rows[moduleDrawerIndex] && (
        <Drawer open onOpenChange={(open) => !open && setModuleDrawerIndex(null)} direction="right">
          <DrawerContent className="inset-y-0 right-0 bottom-auto left-auto mt-0 h-full w-full max-w-xl rounded-none border-l">
            <DrawerHeader className="border-b border-line text-left">
              <DrawerTitle>{rows[moduleDrawerIndex].module_name || "New quotation module"}</DrawerTitle>
              <DrawerDescription>Create a separate module copy for this quotation.</DrawerDescription>
            </DrawerHeader>
            <div className="grid flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium">Module name</span><Input disabled={disabled} placeholder="Inventory Management" {...register(`modules.${moduleDrawerIndex}.module_name`)} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Description</span><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={disabled} {...register(`modules.${moduleDrawerIndex}.description`)} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Requirements</span><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={disabled} {...register(`modules.${moduleDrawerIndex}.requirements`)} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Estimated cost</span><Input type="number" min={0} step="0.01" disabled={disabled} {...register(`modules.${moduleDrawerIndex}.estimated_cost`, { valueAsNumber: true })} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Estimated days</span><Input type="number" min={0} step={1} disabled={disabled} {...register(`modules.${moduleDrawerIndex}.estimated_days`, { valueAsNumber: true })} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Priority</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={disabled} {...register(`modules.${moduleDrawerIndex}.priority`)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Remarks</span><Input disabled={disabled} {...register(`modules.${moduleDrawerIndex}.remarks`)} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Quotation amount</span><Input type="number" min={0} step="0.01" disabled={disabled} {...register(`modules.${moduleDrawerIndex}.amount`, { valueAsNumber: true })} /></label>
              <div className="flex justify-end sm:col-span-2"><Button type="button" onClick={() => setModuleDrawerIndex(null)}>Done</Button></div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

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
