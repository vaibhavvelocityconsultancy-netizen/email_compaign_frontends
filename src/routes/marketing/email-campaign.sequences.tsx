import { ModuleHero } from "@/components/ModuleHero";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useFieldArray, useFormContext, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EntityForm, fieldPresets, type FormFieldConfig } from "@/components/common/EntityForm";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  createSequence,
  deleteSequence,
  getBatches,
  getSequences,
  getTemplates,
  updateSequence,
  type Sequence,
  type SequenceInput,
  type EmailTemplate,
} from "@/lib/api";

export const Route = createFileRoute("/marketing/email-campaign/sequences")({
  head: () => ({
    meta: [
      { title: "Sequences — Vantage CRM" },
      { name: "description", content: "Build reusable email sequences from templates." },
    ],
  }),
  component: SequencesPage,
});

const sequenceSchema = z.object({
  name: z.string().trim().min(1, "Sequence name is required"),
  description: z.string(),
  steps: z.array(z.object({
    templateId: z.number().int().positive("Choose an email template"),
    delayDays: z.number().int().min(0, "Delay cannot be negative"),
    delayMinutes: z.number().int().min(0, "Delay cannot be negative"),
    sendDate: z.string(),
    sendTime: z.string(),
  })).min(1, "Add at least one step"),
});

type SequenceFormValues = z.infer<typeof sequenceSchema>;

function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAfterDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(0, days));
  return toLocalDateInput(date);
}

function daysFromToday(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${value}T00:00:00`);
  return Math.max(0, Math.round((selected.getTime() - today.getTime()) / 86400000));
}

function parseLocalDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function formatCalendarDate(value: string) {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Select date";
}

function SequenceStepsEditor({ templates, disabled }: { templates: EmailTemplate[]; disabled: boolean }) {
  const { control, setValue, watch } = useFormContext<SequenceFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "steps", keyName: "fieldKey" });

  return (
    <section className="col-span-full space-y-4 rounded-lg border border-line bg-background/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Sequence steps</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Today sends immediately; future dates schedule the step.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={disabled || templates.length === 0}
          onClick={() => append({ templateId: Number(templates[0]?.id ?? 0), delayDays: 0, delayMinutes: 0, sendDate: toLocalDateInput(new Date()), sendTime: "" })}
        >
          <Plus className="size-4" /> Add step
        </Button>
      </div>

      {templates.length === 0 && (
        <p className="rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-foreground">
          Create an email template before adding sequence steps.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((item, index) => {
          const templateId = watch(`steps.${index}.templateId`);
          const chosenTemplate = templates.find((template) => template.id === String(templateId));

          return (
            <div key={item.fieldKey} className="rounded-md border border-line/50 bg-background/50">
              {/* Step header */}
              <div className="flex items-center justify-between border-b border-line/50 px-3 py-2 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 font-mono text-xs font-semibold text-brand">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">Step {index + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  disabled={disabled || fields.length === 1}
                  title="Remove step"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* Step fields */}
              <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 sm:p-4">
                <FormField
                  control={control}
                  name={`steps.${index}.templateId` as FieldPath<SequenceFormValues>}
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-2 sm:col-span-2">
                      <FormLabel>Email template</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(value) => field.onChange(Number(value))}
                        disabled={disabled || templates.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {chosenTemplate && (
                        <p className="truncate text-xs text-muted-foreground">Subject: {chosenTemplate.subject}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`steps.${index}.sendDate` as FieldPath<SequenceFormValues>}
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-2">
                      <FormLabel>Send date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" disabled={disabled}>
                              <CalendarDays className="mr-2 size-4 shrink-0" />
                              <span className="truncate">{formatCalendarDate(field.value as string)}</span>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseLocalDate(field.value as string)}
                            onSelect={(date) => {
                              if (!date) return;
                              const selectedDate = toLocalDateInput(date);
                              field.onChange(selectedDate);
                              const delayDays = daysFromToday(selectedDate);
                              setValue(`steps.${index}.delayDays`, delayDays, { shouldDirty: true, shouldValidate: true });
                              if (!delayDays) setValue(`steps.${index}.delayMinutes`, 0, { shouldDirty: true });
                            }}
                            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`steps.${index}.delayMinutes` as FieldPath<SequenceFormValues>}
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-2">
                      <FormLabel>Extra delay (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="w-full"
                          disabled={disabled}
                          value={field.value as number}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <input type="hidden" {...control.register(`steps.${index}.delayDays`)} />
              <input type="hidden" {...control.register(`steps.${index}.sendTime`)} />
              <span className="sr-only" aria-live="polite">Step template: {chosenTemplate?.name ?? "not selected"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function SequencesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [toDelete, setToDelete] = useState<Sequence | null>(null);

  const sequencesQuery = useQuery({ queryKey: ["sequences"], queryFn: getSequences });
  const templatesQuery = useQuery({ queryKey: ["templates"], queryFn: getTemplates });
  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: getBatches });
  const sequences = sequencesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const campaigns = campaignsQuery.data ?? [];
  const templateById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates]);
  const campaignSequenceIds = useMemo(() => new Set(campaigns.map((campaign) => campaign.sequenceId)), [campaigns]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = useCallback((sequence: Sequence) => {
    setEditing(sequence);
    setFormOpen(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (values: SequenceFormValues) => {
      const payload: SequenceInput = {
        name: values.name,
        description: values.description,
        steps: values.steps.map((step) => ({
          templateId: String(step.templateId),
          delayDays: step.delayDays,
          delayMinutes: step.delayMinutes,
          sendTime: step.sendTime,
        })),
      };
      return editing ? updateSequence(editing.id, payload) : createSequence(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sequences"] });
      setFormOpen(false);
      toast.success(editing ? "Sequence updated" : "Sequence created");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save sequence"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (campaignSequenceIds.has(id)) {
        throw new Error("This sequence is assigned to a campaign. Remove or reassign those campaigns first.");
      }
      return deleteSequence(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sequences"] });
      setToDelete(null);
      toast.success("Sequence deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete sequence"),
  });

  const columns = useMemo<Column<Sequence>[]>(() => [
    {
      key: "name",
      header: "Sequence",
      cell: (sequence) => <span className="font-medium">{sequence.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (sequence) => <span className="line-clamp-2 max-w-md text-muted-foreground">{sequence.description || "No description"}</span>,
    },
    {
      key: "steps",
      header: "Steps",
      filterValue: (sequence) => sequence.steps.length,
      cell: (sequence) => <span className="font-mono text-xs">{sequence.steps.length}</span>,
    },
    {
      key: "templates",
      header: "Templates",
      sortable: false,
      filterable: false,
      cell: (sequence) => (
        <span className="block max-w-xs truncate text-xs text-muted-foreground">
          {sequence.steps.map((step) => templateById.get(step.templateId)?.name ?? "Missing template").join(" · ") || "No steps"}
        </span>
      ),
    },
    {
      key: "usage",
      header: "Campaign use",
      filterValue: (sequence) => campaigns.filter((campaign) => campaign.sequenceId === sequence.id).length,
      cell: (sequence) => {
        const count = campaigns.filter((campaign) => campaign.sequenceId === sequence.id).length;
        return count ? <StatusBadge status={`${count} campaign${count === 1 ? "" : "s"}`} /> : <span className="text-xs text-muted-foreground">Unused</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      filterable: false,
      className: "text-right",
      headerClassName: "text-right",
      cell: (sequence) => {
        const inUse = campaignSequenceIds.has(sequence.id);
        return (
          <div className="flex justify-end gap-3 text-xs font-medium">
            <button type="button" onClick={() => openEdit(sequence)} className="text-brand hover:underline">Edit</button>
            <button
              type="button"
              onClick={() => setToDelete(sequence)}
              disabled={inUse}
              title={inUse ? "Sequence is used by a campaign" : "Delete sequence"}
              className="text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], [templateById, campaigns, campaignSequenceIds, openEdit]);

  const fields = useMemo<FormFieldConfig[]>(() => [
    fieldPresets.text("name", "Sequence name", { required: true, placeholder: "Standard follow-up", colSpan: 2 }),
    fieldPresets.textarea("description", "Description", { rows: 2, placeholder: "When should this sequence be used?" }),
  ], []);

  const defaultValues = useMemo<Partial<SequenceFormValues>>(() => editing ? {
    name: editing.name,
    description: editing.description,
    steps: editing.steps.map((step) => ({
      templateId: Number(step.templateId),
      delayDays: step.delayDays,
      delayMinutes: step.delayMinutes,
      sendDate: dateAfterDays(step.delayDays),
      sendTime: step.sendTime,
    })),
  } : {
    name: "",
    description: "",
    steps: [{ templateId: Number(templates[0]?.id ?? 0), delayDays: 0, delayMinutes: 0, sendDate: toLocalDateInput(new Date()), sendTime: "" }],
  }, [editing, templates]);

  const canCreate = templates.length > 0;

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-card/60 p-5 shadow-sm">
        <div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">AUTOMATION</div>
          <ModuleHero eyebrow="Campaign automation" title="Sequences" description="Build consistent follow-up journeys that keep prospects moving forward." icon={<span aria-hidden="true">•</span>} />
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Orchestrate thoughtful follow-ups with reusable steps and timing.</p>
        </div>
        <div className="rounded-lg border border-line bg-background/60 px-3 py-2 text-right">
          <div className="font-mono text-lg font-semibold">{sequences.length}</div>
          <div className="text-[11px] text-muted-foreground">active sequences</div>
        </div>
      </div>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<Sequence>
          data={sequences}
          columns={columns}
          searchKeys={["name", "description"]}
          searchPlaceholder="Search sequences..."
          storageKey="email-sequences"
          emptyMessage={sequencesQuery.isLoading ? "Loading sequences…" : "No sequences yet. Create a sequence from your email templates."}
          toolbarActions={(
            <Button size="sm" className="h-9 gap-1.5" disabled={!canCreate} title={!canCreate ? "Create an email template first" : undefined} onClick={openCreate}>
              <Plus className="size-4" /> New sequence
            </Button>
          )}
        />
        {sequencesQuery.isError && <p className="mt-2 text-sm text-destructive">{sequencesQuery.error.message}</p>}
        {!canCreate && !templatesQuery.isLoading && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-4 text-warn" /> Create an email template before building a sequence.
          </p>
        )}
        {campaignsQuery.isError && <p className="mt-2 text-sm text-destructive">Could not load campaign usage: {campaignsQuery.error.message}</p>}
      </div>

      <EntityForm<SequenceFormValues>
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit sequence" : "Create sequence"}
        fields={fields}
        schema={sequenceSchema}
        defaultValues={defaultValues}
        isEdit={Boolean(editing)}
        isLoading={saveMutation.isPending}
        submitLabel="Save sequence"
        size="lg"
        onSubmit={async (values) => { await saveMutation.mutateAsync(values); }}
      >
        <SequenceStepsEditor templates={templates} disabled={saveMutation.isPending} />
      </EntityForm>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        title="Delete sequence"
        message={`Delete “${toDelete?.name ?? "this sequence"}”? Sequences used by campaigns cannot be deleted.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
