import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EntityForm, fieldPresets, type FormFieldConfig } from "@/components/common/EntityForm";
import { request } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

type Tab = "country" | "state" | "city";
const TABS: Tab[] = ["country", "state", "city"];

export const Route = createFileRoute("/location")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab: TABS.includes(search.tab as Tab) ? (search.tab as Tab) : "country",
  }),
  component: LocationPage,
});

/* ------------------------------------------------------------------ */
/* Types, schemas and API — adjust to match your backend               */
/* ------------------------------------------------------------------ */

interface Country { id: number; name: string; code: string; is_active: boolean }
interface State { id: number; name: string; country: number; is_active: boolean }
interface City { id: number; name: string; state: number; is_active: boolean }

const ENDPOINTS: Record<Tab, string> = {
  country: "/countries/",
  state: "/states/",
  city: "/cities/",
};

const LABEL: Record<Tab, string> = { country: "Country", state: "State", city: "City" };

const name = z.string().trim().min(1, "Enter a name.").max(100, "Keep this under 100 characters.");
const pick = (message: string) =>
  z.union([z.number(), z.literal("")]).refine((v) => v !== "", message);

const schemas = {
  country: z.object({
    name,
    code: z.string().trim().regex(/^([A-Za-z]{2,3})?$/, "Use a 2 or 3 letter code."),
    is_active: z.boolean(),
  }),
  state: z.object({ name, country: pick("Select a country."), is_active: z.boolean() }),
  city: z.object({ name, state: pick("Select a state."), is_active: z.boolean() }),
} as unknown as Record<Tab, z.ZodType<Record<string, any>>>;

// Handles plain arrays and DRF paginated responses.
const fetchAll = async <T,>(url: string): Promise<T[]> => {
  const data = await request<T[] | { results: T[] }>(url);
  return Array.isArray(data) ? data : data.results;
};

const statusBadge = (active: boolean) => (
  <span
    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
      active ? "bg-good/10 text-good" : "bg-muted text-muted-foreground"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

const SEARCH_KEYS_COUNTRY: (keyof Country)[] = ["name", "code"];
const SEARCH_KEYS_NAME: ("name")[] = ["name"];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function LocationPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [countries, setCountries] = React.useState<Country[]>([]);
  const [states, setStates] = React.useState<State[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<{ id: number } | null>(null);
  const [saving, setSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const [c, s, ci] = await Promise.all([
        fetchAll<Country>(ENDPOINTS.country),
        fetchAll<State>(ENDPOINTS.state),
        fetchAll<City>(ENDPOINTS.city),
      ]);
      setCountries(c);
      setStates(s);
      setCities(ci);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  /* Lookups and counts, derived on the client so the API stays simple */
  const countryName = React.useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
  const stateById = React.useMemo(() => new Map(states.map((s) => [s.id, s])), [states]);
  const statesPerCountry = React.useMemo(() => {
    const map = new Map<number, number>();
    states.forEach((s) => map.set(s.country, (map.get(s.country) ?? 0) + 1));
    return map;
  }, [states]);
  const citiesPerState = React.useMemo(() => {
    const map = new Map<number, number>();
    cities.forEach((c) => map.set(c.state, (map.get(c.state) ?? 0) + 1));
    return map;
  }, [cities]);

  const openEdit = (row: { id: number }) => {
    setEditing(row);
    setFormOpen(true);
  };
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const editButton = (row: { id: number; name: string }) => (
    <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${row.name}`} onClick={() => openEdit(row)}>
      <Pencil className="size-4" />
    </Button>
  );

  /* Columns */
  const countryColumns = React.useMemo<Column<Country>[]>(
    () => [
      { key: "name", header: "Country", filterable: false, cell: (r) => <span className="font-medium">{r.name}</span> },
      { key: "code", header: "Code", filterable: false, cell: (r) => <span className="font-mono text-xs">{r.code || "—"}</span> },
      {
        key: "states",
        header: "States",
        sortable: false,
        filterable: false,
        cell: (r) => statesPerCountry.get(r.id) ?? 0,
      },
      { key: "is_active", header: "Status", filterValue: (r) => (r.is_active ? "Active" : "Inactive"), cell: (r) => statusBadge(r.is_active) },
      { key: "actions", header: "", className: "w-10", cell: editButton },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statesPerCountry],
  );

  const stateColumns = React.useMemo<Column<State>[]>(
    () => [
      { key: "name", header: "State", filterable: false, cell: (r) => <span className="font-medium">{r.name}</span> },
      {
        key: "country",
        header: "Country",
        filterValue: (r) => countryName.get(r.country) ?? null,
        cell: (r) => countryName.get(r.country) ?? "—",
      },
      {
        key: "cities",
        header: "Cities",
        sortable: false,
        filterable: false,
        cell: (r) => citiesPerState.get(r.id) ?? 0,
      },
      { key: "is_active", header: "Status", filterValue: (r) => (r.is_active ? "Active" : "Inactive"), cell: (r) => statusBadge(r.is_active) },
      { key: "actions", header: "", className: "w-10", cell: editButton },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryName, citiesPerState],
  );

  const cityColumns = React.useMemo<Column<City>[]>(
    () => [
      { key: "name", header: "City", filterable: false, cell: (r) => <span className="font-medium">{r.name}</span> },
      {
        key: "state",
        header: "State",
        filterValue: (r) => stateById.get(r.state)?.name ?? null,
        cell: (r) => stateById.get(r.state)?.name ?? "—",
      },
      {
        key: "country",
        header: "Country",
        filterValue: (r) => countryName.get(stateById.get(r.state)?.country ?? -1) ?? null,
        cell: (r) => countryName.get(stateById.get(r.state)?.country ?? -1) ?? "—",
      },
      { key: "is_active", header: "Status", filterValue: (r) => (r.is_active ? "Active" : "Inactive"), cell: (r) => statusBadge(r.is_active) },
      { key: "actions", header: "", className: "w-10", cell: editButton },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stateById, countryName],
  );

  /* Form config for the active tab */
  const statusField = fieldPresets.switch("is_active", "Status", { defaultValue: true, placeholder: "Active" });

  const formFields = React.useMemo<Record<Tab, FormFieldConfig[]>>(
    () => ({
      country: [
        fieldPresets.row([
          fieldPresets.text("name", "Country name", { required: true, placeholder: "India" }),
          fieldPresets.text("code", "ISO code", { placeholder: "IN" }),
        ]),
        statusField,
      ],
      state: [
        fieldPresets.searchableSelect(
          "country",
          "Country",
          countries.map((c) => ({ value: c.id, label: c.name })),
          { required: true, colSpan: 2, placeholder: "Select country" },
        ),
        fieldPresets.text("name", "State name", { required: true, colSpan: 2, placeholder: "Maharashtra" }),
        statusField,
      ],
      city: [
        fieldPresets.searchableSelect(
          "state",
          "State",
          states.map((s) => ({ value: s.id, label: `${s.name}, ${countryName.get(s.country) ?? ""}` })),
          { required: true, colSpan: 2, placeholder: "Select state" },
        ),
        fieldPresets.text("name", "City name", { required: true, colSpan: 2, placeholder: "Mumbai" }),
        statusField,
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countries, states, countryName],
  );

  const editingValues = React.useMemo<Record<string, unknown> | undefined>(() => {
    if (!editing) return undefined;
    if (tab === "country") {
      const r = countries.find((c) => c.id === editing.id);
      return r && { name: r.name, code: r.code, is_active: r.is_active };
    }
    if (tab === "state") {
      const r = states.find((s) => s.id === editing.id);
      return r && { name: r.name, country: r.country, is_active: r.is_active };
    }
    const r = cities.find((c) => c.id === editing.id);
    return r && { name: r.name, state: r.state, is_active: r.is_active };
  }, [editing, tab, countries, states, cities]);

  const onSubmit = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      const payload = { ...values };
      if (tab === "country") payload.code = String(values.code ?? "").toUpperCase();
      if (tab === "state") payload.country = Number(values.country);
      if (tab === "city") payload.state = Number(values.state);

      await request(editing ? `${ENDPOINTS[tab]}${editing.id}/` : ENDPOINTS[tab], {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`${LABEL[tab]} ${editing ? "updated" : "added"}`);
      setFormOpen(false);
      await refresh();
    } finally {
      setSaving(false); // errors propagate to EntityForm, which shows a toast
    }
  };

  const missingParent =
    (tab === "state" && countries.length === 0) || (tab === "city" && states.length === 0);
  const counts: Record<Tab, number> = { country: countries.length, state: states.length, city: cities.length };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Countries, states and cities used across the app.</p>
        </div>
        <Button
          className="gap-1.5"
          onClick={openCreate}
          disabled={loading || missingParent}
          title={missingParent ? `Add a ${tab === "state" ? "country" : "state"} first` : undefined}
        >
          <Plus className="size-4" />
          Add {LABEL[tab].toLowerCase()}
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => navigate({ search: { tab: value as Tab } })}
        className="space-y-4"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="gap-2">
              {LABEL[t]}
              <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">{counts[t]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="country" className="mt-0">
          <DataTable
            data={countries}
            columns={countryColumns}
            searchKeys={SEARCH_KEYS_COUNTRY}
            searchPlaceholder="Search countries"
            emptyMessage={loading ? "Loading…" : "No countries yet. Add the first one."}
            storageKey="location-country"
          />
        </TabsContent>

        <TabsContent value="state" className="mt-0">
          <DataTable
            data={states}
            columns={stateColumns}
            searchKeys={SEARCH_KEYS_NAME}
            searchPlaceholder="Search states"
            emptyMessage={loading ? "Loading…" : "No states yet. Add a country first, then its states."}
            storageKey="location-state"
          />
        </TabsContent>

        <TabsContent value="city" className="mt-0">
          <DataTable
            data={cities}
            columns={cityColumns}
            searchKeys={SEARCH_KEYS_NAME}
            searchPlaceholder="Search cities"
            emptyMessage={loading ? "Loading…" : "No cities yet. Add a state first, then its cities."}
            storageKey="location-city"
          />
        </TabsContent>
      </Tabs>

      <EntityForm<Record<string, any>>
        key={`${tab}-${editing?.id ?? "new"}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        title={`${editing ? "Edit" : "Add"} ${LABEL[tab].toLowerCase()}`}
        fields={formFields[tab]}
        schema={schemas[tab]}
        defaultValues={editingValues}
        isEdit={Boolean(editing)}
        isLoading={saving}
        size="sm"
        submitLabel={editing ? "Save changes" : `Add ${LABEL[tab].toLowerCase()}`}
        onSubmit={onSubmit}
      />
    </div>
  );
}