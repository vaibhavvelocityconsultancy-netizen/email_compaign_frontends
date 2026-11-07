import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Modal } from "@/components/common/Modal";
import { createLeadCategory, getLeadCategories, updateLeadCategory, type LeadCategory } from "@/lib/api";

export const Route = createFileRoute("/lead-categories")({
  head: () => ({
    meta: [
      { title: "Lead Categories — Vantage CRM" },
      { name: "description", content: "Manage categories used by leads, campaigns, imports, and templates." },
    ],
  }),
  component: LeadCategoriesPage,
});

function LeadCategoriesPage() {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ["lead-categories"], queryFn: getLeadCategories });
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<LeadCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? updateLeadCategory(editing.id, name.trim())
      : createLeadCategory(name.trim()),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ["lead-categories"] });
      setName("");
      setFormOpen(false);
      setEditing(null);
      toast.success(`Category "${category.name}" ${editing ? "updated" : "added"}`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not save category"),
  });

  const columns: Column<LeadCategory>[] = [
    {
      key: "name",
      header: "Category",
      cell: (category) => (
        <button
          type="button"
          onClick={() => {
            setEditing(category);
            setName(category.name);
            setFormOpen(true);
          }}
          className="text-left font-medium hover:text-brand hover:underline"
          aria-label={`Edit category ${category.name}`}
        >
          {category.name}
        </button>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      filterValue: (category) => category.created_at,
      cell: (category) => <span className="font-mono text-xs text-muted-foreground">{new Date(category.created_at).toLocaleDateString()}</span>,
    },
  ];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">MASTERS</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Lead Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">Categories are shared by leads, CSV imports, campaigns, and email templates.</p>
      </div>

      <DataTable<LeadCategory>
        data={categoriesQuery.data ?? []}
        columns={columns}
        searchKeys={["name"]}
        searchPlaceholder="Search categories..."
        storageKey="lead-categories-master"
        emptyMessage={categoriesQuery.isLoading ? "Loading categories…" : "No categories yet. Add one above."}
        toolbarActions={(
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setName("");
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add category
          </Button>
        )}
      />

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setName("");
        }}
        title={editing ? "Edit category" : "Add category"}
        eyebrow="LEAD CATEGORY"
      >
        <form onSubmit={submit}>
          <div className="space-y-4 p-5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Category name, e.g. Doctor"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Add category"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
