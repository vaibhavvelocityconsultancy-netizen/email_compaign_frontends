import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, type EmailTemplate } from "../lib/mock-api";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState, LoadingRows } from "../components/common/EmptyState";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Email Templates — Vantage CRM" },
      { name: "description", content: "Create, edit, and preview reusable email templates." },
      { property: "og:title", content: "Email Templates — Vantage CRM" },
      { property: "og:description", content: "Create, edit, and preview reusable email templates." },
    ],
  }),
  component: TemplatesPage,
});

const EMPTY = { name: "", subject: "", body: "", signature: "" };

function TemplatesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: getTemplates });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setLogo(null);
    setAttachment(null);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, signature: t.signature });
    setLogo(null);
    setAttachment(null);
    setErrors({});
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        logoName: logo?.name ?? editing?.logoName,
        attachmentName: attachment?.name ?? editing?.attachmentName,
      };
      return editing ? updateTemplate(editing.id, payload) : createTemplate(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setFormOpen(false);
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

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.subject.trim()) errs.subject = "Subject is required";
    if (!form.body.trim()) errs.body = "Body is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    save.mutate();
  };

  const inputCls =
    "mt-1.5 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";
  const labelCls = "font-mono text-[11px] text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-wide text-muted-foreground">CONTENT</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Email Templates</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
        >
          <Plus className="size-4" /> Create Template
        </button>
      </div>

      <div className="rise overflow-hidden rounded-xl border border-line bg-surface" style={{ animationDelay: "80ms" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <LoadingRows cols={4} />
            ) : !data?.length ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState title="No templates yet" hint="Create your first email template to build a sequence." />
                </td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-background/60">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.subject}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <button onClick={() => setPreview(t)} className="text-muted-foreground hover:underline">Preview</button>
                      <button onClick={() => openEdit(t)} className="text-brand hover:underline">Edit</button>
                      <button onClick={() => setToDelete(t)} className="text-bad hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Email Template" : "Create Email Template"}
        eyebrow={editing ? "EDIT" : "NEW"}
        wide
      >
        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>NAME</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Follow Up Day 0" />
            {errors.name && <p className="mt-1 text-[11px] text-bad">{errors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>SUBJECT</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} placeholder="Thank you for your interest" />
            {errors.subject && <p className="mt-1 text-[11px] text-bad">{errors.subject}</p>}
          </div>
          <div>
            <label className={labelCls}>BODY</label>
            <textarea rows={7} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputCls} placeholder="Hi {{name}}, …" />
            {errors.body && <p className="mt-1 text-[11px] text-bad">{errors.body}</p>}
          </div>
          <div>
            <label className={labelCls}>SIGNATURE</label>
            <textarea rows={3} value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} className={inputCls} placeholder="Best regards,&#10;The Sales Team" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>LOGO</label>
              <label className="mt-1.5 flex cursor-pointer items-center justify-between rounded-lg border border-line bg-background px-3 py-2 text-sm hover:border-brand">
                <span className="truncate">{logo?.name ?? editing?.logoName ?? "Choose file"}</span>
                <span className="font-mono text-[11px] text-muted-foreground">Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div>
              <label className={labelCls}>ATTACHMENT</label>
              <label className="mt-1.5 flex cursor-pointer items-center justify-between rounded-lg border border-line bg-background px-3 py-2 text-sm hover:border-brand">
                <span className="truncate">{attachment?.name ?? editing?.attachmentName ?? "Choose file"}</span>
                <span className="font-mono text-[11px] text-muted-foreground">Upload</span>
                <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line bg-background/50 px-5 py-4">
          <button onClick={() => setFormOpen(false)} className="h-9 rounded-lg border border-line bg-surface px-4 text-sm transition-colors hover:bg-background">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={save.isPending}
            className="h-9 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save Template"}
          </button>
        </div>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Template preview" eyebrow="AS RECIPIENT SEES IT" wide>
        {preview && (
          <div className="p-5">
            <div className="rounded-xl border border-line bg-background p-5">
              <div className="font-display text-base font-semibold">{preview.subject}</div>
              <div className="my-4 h-px bg-line" />
              <div className="text-sm whitespace-pre-wrap">{preview.body}</div>
              <div className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{preview.signature}</div>
            </div>
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
