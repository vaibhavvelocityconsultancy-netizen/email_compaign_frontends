import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/common/DataTable";
import { CompanyContactsDialog } from "@/components/companies/CompanyContactsDialog";
import { CompanyFormDialog } from "@/components/companies/CompanyFormDialog";
import { Button } from "@/components/ui/button";
import { listCompanies, type Company } from "@/lib/company-api";

export const Route = createFileRoute("/company")({
  component: CompaniesPage,
});

const SEARCH_KEYS: (keyof Company)[] = ["name", "city", "state", "gst_number", "pincode"];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Company | null>(null);
  const [contactsFor, setContactsFor] = React.useState<Company | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setCompanies(await listCompanies());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load companies");
    } finally {
      setLoading(false);
    }
  }, []);

  const openCompanyForm = React.useCallback((company: Company | null = null) => {
    setEditing(company);
    setFormOpen(true);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const columns = React.useMemo<Column<Company>[]>(
    () => [
      {
        key: "name",
        header: "Company",
        filterable: false,
        cell: (company) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{company.name}</p>
            {company.gst_number && <p className="font-mono text-xs text-muted-foreground">{company.gst_number}</p>}
          </div>
        ),
      },
      {
        key: "city",
        header: "Location",
        filterValue: (company) => company.city || null,
        cell: (company) => [company.city_name, company.state_name].filter(Boolean).join(", ") || "—",
      },
      { key: "country", header: "Country", cell: (company) => company.country_name || "—" },
      {
        key: "contacts",
        header: "Contacts",
        sortable: false,
        filterable: false,
        cell: (company) => (
          <button
            type="button"
            onClick={() => setContactsFor(company)}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Users className="size-4" />
            {company.contacts_count ?? (company.is_contact ? "View" : "Add")}
          </button>
        ),
      },
      {
        key: "is_active",
        header: "Status",
        filterValue: (company) => (company.is_active ? "Active" : "Inactive"),
        cell: (company) => (
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${company.is_active ? "bg-good/10 text-good" : "bg-muted text-muted-foreground"}`}>
            {company.is_active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "created_at",
        header: "Added",
        filterType: "date",
        filterValue: (company) => company.created_at,
        cell: (company) => formatDate(company.created_at),
      },
      {
        key: "actions",
        header: "",
        className: "w-10",
        cell: (company) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Edit ${company.name}`}
            onClick={() => openCompanyForm(company)}
          >
            <Pencil className="size-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading companies…" : `${companies.length} companies`}
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => openCompanyForm()}>
          <Plus className="size-4" />
          Add company
        </Button>
      </div>

      <DataTable
        data={companies}
        columns={columns}
        searchKeys={SEARCH_KEYS}
        searchPlaceholder="Search by name, city or GST number"
        emptyMessage={loading ? "Loading companies…" : "No companies yet. Add your first company."}
        storageKey="companies"
        pageSize={20}
      />

      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} company={editing} onSaved={refresh} />
      <CompanyContactsDialog
        company={contactsFor}
        onOpenChange={(open) => !open && setContactsFor(null)}
        onChanged={refresh}
      />
    </div>
  );
}
