import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/common/DataTable";
import { createLeadCategory, getLeadCategories, type LeadCategory } from "@/lib/api";

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

  const createMutation = useMutation({
    mutationFn: () => createLeadCategory(name.trim()),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ["lead-categories"] });
      setName("");
      toast.success(`Category "${category.name}" added`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not add category"),
  });

  const columns: Column<LeadCategory>[] = [
    { key: "name", header: "Category", cell: (category) => <span className="font-medium">{category.name}</span> },
    {
      key: "created_at",
      header: "Created",
      filterValue: (category) => category.created_at,
      cell: (category) => <span className="font-mono text-xs text-muted-foreground">{new Date(category.created_at).toLocaleDateString()}</span>,
    },
  ];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">MASTERS</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Lead Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">Categories are shared by leads, CSV imports, campaigns, and email templates.</p>
      </div>

      <form onSubmit={submit} className="flex max-w-xl gap-2 rounded-xl border border-line bg-surface p-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Category name, e.g. Doctor"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
          <Plus className="size-4" /> {createMutation.isPending ? "Adding…" : "Add category"}
        </Button>
      </form>

      <DataTable<LeadCategory>
        data={categoriesQuery.data ?? []}
        columns={columns}
        searchKeys={["name"]}
        searchPlaceholder="Search categories..."
        storageKey="lead-categories-master"
        emptyMessage={categoriesQuery.isLoading ? "Loading categories…" : "No categories yet. Add one above."}
      />
    </div>
  );
}
