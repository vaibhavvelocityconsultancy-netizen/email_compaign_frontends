import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getEmailSignatures,
  saveEmailSignature,
  deleteEmailSignature,
  type EmailSignature,
  getLeadCategories,
  createLeadCategory,
  type MessageTemplate,
  type Channel,
} from "../../lib/api";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { DataTable, type Column } from "../../components/common/DataTable";
import { EntityForm, fieldPresets, type FormFieldConfig } from "../../components/common/EntityForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    categoryId: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().trim().min(1, "Body is required"),
    signatureId: z.string().optional(),
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

const formatEmailBody = (body: string) =>
  body
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join("\n")
    .trim();

// `hidden` receives the form; read the live channel value from it
type HiddenForm = UseFormReturn<Record<string, unknown>>;
const hideForWhatsApp = (form: HiddenForm) => form.watch("channel") === "whatsapp";
const hideForEmail = (form: HiddenForm) => form.watch("channel") !== "whatsapp";

function TemplatesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: getTemplates });
  const { data: categories = [] } = useQuery({ queryKey: ["lead-categories"], queryFn: getLeadCategories });
  const { data: signatures = [] } = useQuery({ queryKey: ["email-signatures"], queryFn: getEmailSignatures });

  const [tab, setTab] = useState<Channel>("email");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [preview, setPreview] = useState<MessageTemplate | null>(null);
  const [toDelete, setToDelete] = useState<MessageTemplate | null>(null);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [signatureManagerOpen, setSignatureManagerOpen] = useState(false);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [signatureLogo, setSignatureLogo] = useState<File | undefined>();
  const [signatureIsDefault, setSignatureIsDefault] = useState(false);
  const [signatureToDelete, setSignatureToDelete] = useState<EmailSignature | null>(null);

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
        categoryId: values.categoryId && values.categoryId !== "none" ? Number(values.categoryId) : null,
        body: values.body,
        subject: isEmail ? values.subject ?? "" : "",
        signature: isEmail ? values.signature ?? "" : "",
        signatureId: isEmail && values.signatureId && values.signatureId !== "none" ? values.signatureId : null,
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

  const addCategory = useMutation({
    mutationFn: () => createLeadCategory(categoryNameDraft.trim()),
    onSuccess: async (category) => {
      await qc.invalidateQueries({ queryKey: ["lead-categories"] });
      setCategoryNameDraft("");
      setCategoryCreateOpen(false);
      toast.success(`Category "${category.name}" added. Select it in the template form.`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not add category"),
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

  const signatureSave = useMutation({
    mutationFn: () => saveEmailSignature(editingSignature?.id ?? null, {
      name: signatureName.trim(), text: signatureText, logo: signatureLogo, isDefault: signatureIsDefault,
    }),
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ["email-signatures"] });
      setEditingSignature(null);
      setSignatureName("");
      setSignatureText("");
      setSignatureLogo(undefined);
      setSignatureIsDefault(false);
      toast.success(saved.isDefault ? "Signature saved and set as default" : "Signature saved");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save signature"),
  });

  const signatureRemove = useMutation({
    mutationFn: (id: string) => deleteEmailSignature(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-signatures"] });
      setSignatureToDelete(null);
      toast.success("Signature deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete signature"),
  });

  const startSignatureEdit = (signature?: EmailSignature) => {
    setEditingSignature(signature ?? null);
    setSignatureName(signature?.name ?? "");
    setSignatureText(signature?.text ?? "");
    setSignatureLogo(undefined);
    setSignatureIsDefault(signature?.isDefault ?? signatures.length === 0);
  };

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
        { key: "categoryName", header: "Category", cell: (t) => <span className="text-muted-foreground">{t.categoryName || "Uncategorized"}</span> },
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
      {
        ...fieldPresets.select("categoryId", "Category", [
          { value: "none", label: "Uncategorized" },
          ...categories.map((category) => ({ value: String(category.id), label: category.name })),
        ]),
        headerActions: (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCategoryCreateOpen(true)}>
            <Plus className="size-3.5" /> Add
          </Button>
        ),
        hidden: hideForWhatsApp,
      },

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
        ...fieldPresets.select("signatureId", "Signature", [
          { value: "none", label: "No signature" },
          ...signatures.map((signature) => ({
            value: signature.id,
            label: `${signature.name}${signature.isDefault ? " (Default)" : ""}`,
          })),
        ]),
        headerActions: (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
            startSignatureEdit();
            setSignatureManagerOpen(true);
          }}>
            Manage
          </Button>
        ),
        hidden: hideForWhatsApp,
      },

      // Both channels
      fieldPresets.file("attachment", "Attachment", {
        description: editing?.attachmentName ? `Current: ${editing.attachmentName}` : undefined,
      }),
    ],
    [categories, editing, signatures, tab],
  );

  const defaultValues = useMemo<Partial<TemplateFormValues>>(
    () =>
      editing
        ? {
            channel: editing.channel ?? "email",
            name: editing.name,
            categoryId: editing.categoryId == null ? "none" : String(editing.categoryId),
            subject: editing.subject,
            body: editing.body,
            signature: editing.signature,
            signatureId: editing.signatureProfileId ?? "none",
            waTemplateName: editing.waTemplateName,
            waLanguage: editing.waLanguage || "en",
          }
        : {
            channel: tab,
            categoryId: "none",
            signatureId: signatures.find((signature) => signature.isDefault)?.id ?? "none",
            waLanguage: "en",
          },
    [categories, editing, signatures, tab],
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
          toolbarActions={(
            <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Create Template
            </Button>
          )}
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
        open={categoryCreateOpen}
        onClose={() => setCategoryCreateOpen(false)}
        title="Add category"
        eyebrow="TEMPLATE CATEGORY"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">The new category will also be available for leads, campaigns, and CSV imports.</p>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (categoryNameDraft.trim()) addCategory.mutate();
            }}
          >
            <input
              value={categoryNameDraft}
              onChange={(event) => setCategoryNameDraft(event.target.value)}
              placeholder="e.g. Doctor"
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="submit" disabled={!categoryNameDraft.trim() || addCategory.isPending}>
              {addCategory.isPending ? "Adding…" : "Add category"}
            </Button>
          </form>
        </div>
      </Modal>

      <Dialog
        open={signatureManagerOpen}
        onOpenChange={(open) => {
          setSignatureManagerOpen(open);
          if (!open) setEditingSignature(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email signatures</DialogTitle>
          </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Saved signatures</div>
              <Button size="sm" variant="outline" onClick={() => startSignatureEdit()}><Plus className="size-4" /> New signature</Button>
            </div>
            {signatures.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No saved signatures yet.</p>}
            {signatures.map((signature) => (
              <div key={signature.id} className="flex items-start gap-3 rounded-md border border-line p-3">
                {signature.logoUrl && <img src={signature.logoUrl} alt="" className="size-12 rounded object-contain" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    {signature.name}
                    {signature.isDefault && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand">Default</span>}
                  </div>
                  <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{signature.text}</div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => startSignatureEdit(signature)} aria-label="Edit signature"><Pencil className="size-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSignatureToDelete(signature)} aria-label="Delete signature"><Trash2 className="size-4 text-bad" /></Button>
              </div>
            ))}
          </div>
          <form className="space-y-3 rounded-md border border-line p-4" onSubmit={(event) => { event.preventDefault(); if (signatureName.trim()) signatureSave.mutate(); }}>
            <div className="font-medium">{editingSignature ? "Edit signature" : "Create signature"}</div>
            <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Signature name" required />
            <textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} placeholder="Best regards,&#10;The Sales Team" />
            <input className="w-full text-sm" type="file" accept="image/*" onChange={(e) => setSignatureLogo(e.target.files?.[0])} />
            {editingSignature?.logoName && !signatureLogo && <div className="text-xs text-muted-foreground">Current logo: {editingSignature.logoName}</div>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={signatureIsDefault} onChange={(e) => setSignatureIsDefault(e.target.checked)} /> Use as default signature</label>
            <Button type="submit" disabled={!signatureName.trim() || signatureSave.isPending} className="w-full">{signatureSave.isPending ? "Saving…" : "Save signature"}</Button>
            {editingSignature && <Button type="button" variant="outline" className="w-full" onClick={() => startSignatureEdit()}>Cancel edit</Button>}
          </form>
        </div>
        </DialogContent>
      </Dialog>

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
                <div className="text-sm leading-6 whitespace-pre-wrap">
                  {formatEmailBody(preview.body)}
                </div>
                <div className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{preview.signature}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!signatureToDelete}
        onClose={() => setSignatureToDelete(null)}
        onConfirm={() => signatureToDelete && signatureRemove.mutate(signatureToDelete.id)}
        title="Delete signature"
        message={`"${signatureToDelete?.name}" will be removed permanently. Templates already using it keep their saved signature.`}
        loading={signatureRemove.isPending}
      />

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
