import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type MessageTemplate,
  type Channel,
} from "../../lib/api";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { DataTable, type Column } from "../../components/common/DataTable";
import { EntityForm, fieldPresets, type FormFieldConfig } from "../../components/common/EntityForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/marketing/email-campaign/templates")({
  head: () => ({
    meta: [
      { title: "Message Templates — Vantage CRM" },
      { name: "description", content: "Create, edit, and preview reusable email and WhatsApp templates." },
      { property: "og:title", content: "Message Templates — Vantage CRM" },
      { property: "og:description", content: "Create, edit, and preview reusable email and WhatsApp templates." },
    ],
  }),
  component: TemplatesPage,
});

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const templateSchema = z
  .object({
    channel: z.enum(["email", "whatsapp"]),
    name: z.string().trim().min(1, "Name is required"),
    subject: z.string().optional(),
    body: z.string().trim().min(1, "Body is required"),
    signature: z.string().optional(),
    logo: z.any().optional(),
    attachment: z.any().optional(),
    waTemplateName: z.string().optional(),
    waLanguage: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.channel === "email" && !v.subject?.trim()) {
      ctx.addIssue({ code: "custom", path: ["subject"], message: "Subject is required" });
    }
    if (v.channel === "whatsapp" && !v.waTemplateName?.trim()) {
      ctx.addIssue({ code: "custom", path: ["waTemplateName"], message: "Meta template name is required" });
    }
  });

type TemplateFormValues = z.infer<typeof templateSchema>;

// File fields hold an array: saved attachments (objects with id) + newly picked File objects
const pickNewFile = (value: unknown): File | undefined =>
  Array.isArray(value) ? (value.find((v) => v instanceof File) as File | undefined) : undefined;

const waStatusClass = (s?: string) =>
  s === "approved" ? "text-emerald-600" : s === "rejected" ? "text-bad" : "text-muted-foreground";

// `hidden` receives the form; read the live channel value from it
type HiddenForm = UseFormReturn<Record<string, unknown>>;
const hideForWhatsApp = (form: HiddenForm) => form.watch("channel") === "whatsapp";
const hideForEmail = (form: HiddenForm) => form.watch("channel") !== "whatsapp";

function TemplatesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: getTemplates });

  const [tab, setTab] = useState<Channel>("email");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [preview, setPreview] = useState<MessageTemplate | null>(null);
  const [toDelete, setToDelete] = useState<MessageTemplate | null>(null);

  const all = data ?? [];
  const filtered = useMemo(() => all.filter((t) => (t.channel ?? "email") === tab), [all, tab]);
  const counts = useMemo(
    () => ({
      email: all.filter((t) => (t.channel ?? "email") === "email").length,
      whatsapp: all.filter((t) => t.channel === "whatsapp").length,
    }),
    [all],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = useCallback((t: MessageTemplate) => {
    setEditing(t);
    setFormOpen(true);
  }, []);

  const save = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      const isEmail = values.channel === "email";
      const logo = isEmail ? pickNewFile(values.logo) : undefined;
      const attachment = pickNewFile(values.attachment);
      const payload = {
        channel: values.channel,
        name: values.name,
        body: values.body,
        subject: isEmail ? values.subject ?? "" : "",
        signature: isEmail ? values.signature ?? "" : "",
        waTemplateName: isEmail ? "" : values.waTemplateName ?? "",
        waLanguage: isEmail ? "" : values.waLanguage || "en",
        ...(logo ? { logo } : {}),
        ...(attachment ? { attachment } : {}),
      };
      return editing ? updateTemplate(editing.id, payload) : createTemplate(payload);
    },
    onSuccess: (_res, values) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setFormOpen(false);
      setTab(values.channel); // jump to the tab where the saved template lives
      toast.success(editing ? "Template updated" : "Template created");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save template"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setToDelete(null);
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete template"),
  });

  // --- Table columns (differ per tab) ---
  const columns: Column<MessageTemplate>[] = useMemo(() => {
    const nameCol: Column<MessageTemplate> = {
      key: "name",
      header: "Name",
      cell: (t) => <span className="font-medium">{t.name}</span>,
    };
    const createdCol: Column<MessageTemplate> = {
      key: "createdAt",
      header: "Created",
      filterType: "date",
      filterValue: (t) => t.createdAt,
      cell: (t) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    };
    const actionsCol: Column<MessageTemplate> = {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      cell: (t) => (
        <div className="flex justify-end gap-3 text-xs font-medium">
          <button onClick={() => setPreview(t)} className="text-muted-foreground hover:underline">Preview</button>
          <button onClick={() => openEdit(t)} className="text-brand hover:underline">Edit</button>
          <button onClick={() => setToDelete(t)} className="text-bad hover:underline">Delete</button>
        </div>
      ),
    };

    if (tab === "email") {
      return [
        nameCol,
        { key: "subject", header: "Subject", cell: (t) => <span className="text-muted-foreground">{t.subject}</span> },
        createdCol,
        actionsCol,
      ];
    }
    return [
      nameCol,
      {
        key: "waTemplateName",
        header: "Meta Template",
        cell: (t) => <span className="font-mono text-xs text-muted-foreground">{t.waTemplateName}</span>,
      },
      {
        key: "waLanguage",
        header: "Language",
        cell: (t) => <span className="text-muted-foreground">{t.waLanguage}</span>,
      },
      {
        key: "waStatus",
        header: "Status",
        cell: (t) => (
          <span className={`text-xs font-medium capitalize ${waStatusClass(t.waStatus)}`}>
            {t.waStatus || "pending"}
          </span>
        ),
      },
      createdCol,
      actionsCol,
    ];
  }, [tab, openEdit]);

  // --- Form fields ---
  const fields: FormFieldConfig[] = useMemo(
    () => [
      fieldPresets.select("channel", "Channel", CHANNEL_OPTIONS, {
        required: true,
        colSpan: 2,
        defaultValue: tab,
        disabled: !!editing, // channel can't change after creation (sequences depend on it)
        description: editing ? "Channel can't be changed after creation." : undefined,
      }),
      fieldPresets.text("name", "Name", { required: true, placeholder: "Follow Up Day 0", colSpan: 2 }),

      // Email only
      {
        ...fieldPresets.text("subject", "Subject", {
          required: true,
          placeholder: "Thank you for your interest",
          colSpan: 2,
        }),
        hidden: hideForWhatsApp,
      },

      // WhatsApp only
      {
        ...fieldPresets.text("waTemplateName", "Meta Template Name", {
          required: true,
          placeholder: "follow_up_day_0",
        }),
        hidden: hideForEmail,
      },
      {
        ...fieldPresets.text("waLanguage", "Language Code", { placeholder: "en" }),
        hidden: hideForEmail,
      },

      fieldPresets.textarea("body", "Body", { required: true, rows: 7, placeholder: "Hi {{name}}, …" }),

      // Email only
      {
        ...fieldPresets.textarea("signature", "Signature", {
          rows: 3,
          placeholder: "Best regards,\nThe Sales Team",
        }),
        hidden: hideForWhatsApp,
      },
      {
        ...fieldPresets.file("logo", "Logo", {
          description: editing?.logoName ? `Current: ${editing.logoName}` : undefined,
        }),
        hidden: hideForWhatsApp,
      },

      // Both channels
      fieldPresets.file("attachment", "Attachment", {
        description: editing?.attachmentName ? `Current: ${editing.attachmentName}` : undefined,
      }),
    ],
    [editing, tab],
  );

  const defaultValues = useMemo<Partial<TemplateFormValues>>(
    () =>
      editing
        ? {
            channel: editing.channel ?? "email",
            name: editing.name,
            subject: editing.subject,
            body: editing.body,
            signature: editing.signature,
            waTemplateName: editing.waTemplateName,
            waLanguage: editing.waLanguage || "en",
          }
        : { channel: tab, waLanguage: "en" },
    [editing, tab],
  );

  const tabLabel = tab === "email" ? "email" : "WhatsApp";

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">CONTENT</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Message Templates</h1>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Channel)}
        className="rise"
        style={{ animationDelay: "40ms" }}
      >
        <TabsList>
          <TabsTrigger value="email">Email ({counts.email})</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp ({counts.whatsapp})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rise" style={{ animationDelay: "80ms" }}>
        <DataTable<MessageTemplate>
          key={tab} // remount so search/filters/columns reset per tab
          data={filtered}
          columns={columns}
          searchKeys={tab === "email" ? ["name", "subject"] : ["name", "waTemplateName"]}
          searchPlaceholder="Search templates..."
          storageKey={`templates-${tab}`}
          emptyMessage={
            isLoading
              ? "Loading templates…"
              : `No ${tabLabel} templates yet. Create your first one to build a sequence.`
          }
          toolbarActions={
            <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Create Template
            </Button>
          }
        />
      </div>

      <EntityForm<TemplateFormValues>
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Template" : "Create Template"}
        fields={fields}
        schema={templateSchema}
        defaultValues={defaultValues}
        isEdit={!!editing}
        isLoading={save.isPending}
        submitLabel="Save Template"
        size="lg"
        onSubmit={(values) => save.mutate(values)}
      />

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Template preview"
        eyebrow={preview?.channel === "whatsapp" ? "AS ON WHATSAPP" : "AS RECIPIENT SEES IT"}
        wide
      >
        {preview && (
          <div className="p-5">
            {preview.channel === "whatsapp" ? (
              <div className="rounded-xl border border-line bg-background p-5">
                <div className="ml-auto max-w-sm rounded-lg rounded-tr-none bg-emerald-100 p-3 text-sm whitespace-pre-wrap text-emerald-950 shadow-sm dark:bg-emerald-900 dark:text-emerald-50">
                  {preview.body}
                </div>
                {preview.waTemplateName && (
                  <div className="mt-3 text-right font-mono text-[11px] text-muted-foreground">
                    {preview.waTemplateName} · {preview.waLanguage}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-background p-5">
                <div className="font-display text-base font-semibold">{preview.subject}</div>
                <div className="my-4 h-px bg-line" />
                <div className="text-sm whitespace-pre-wrap">{preview.body}</div>
                <div className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{preview.signature}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        title="Delete template"
        message={`"${toDelete?.name}" will be removed permanently. Sequences using it will need a new template.`}
        loading={remove.isPending}
      />
    </div>
  );
}