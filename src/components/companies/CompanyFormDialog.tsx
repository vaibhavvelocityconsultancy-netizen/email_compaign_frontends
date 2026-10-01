import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/api";
import {
  createCompany,
  updateCompany,
  type Company,
  type CompanyInput,
} from "@/lib/company-api";

interface CountryOption { id: number; name: string; code?: string | null; is_active?: boolean }
interface StateOption { id: number; name: string; country: number; is_active?: boolean }
interface CityOption { id: number; name: string; state: number; is_active?: boolean }

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSaved: () => void | Promise<void>;
}

function unwrapListResponse<T>(payload: T[] | { results?: T[] } | { data?: T[] } | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray((payload as { results?: T[] }).results)) return (payload as { results: T[] }).results;
  if (Array.isArray((payload as { data?: T[] }).data)) return (payload as { data: T[] }).data;
  return [];
}

export function CompanyFormDialog({ open, onOpenChange, company, onSaved }: CompanyFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | "">(company?.country ?? "");
  const [selectedState, setSelectedState] = useState<number | "">(company?.state ?? "");
  const [selectedCity, setSelectedCity] = useState<number | "">(company?.city ?? "");
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    setError(undefined);
    if (!open) return;

    let cancelled = false;
    async function loadLocations() {
      setLoadingLocations(true);
      try {
        const [countryResponse, stateResponse, cityResponse] = await Promise.all([
          request<CountryOption[] | { results: CountryOption[] }>('/countries/'),
          request<StateOption[] | { results: StateOption[] }>('/states/'),
          request<CityOption[] | { results: CityOption[] }>('/cities/'),
        ]);

        if (cancelled) return;

        const countryList = unwrapListResponse(countryResponse);
        const stateList = unwrapListResponse(stateResponse);
        const cityList = unwrapListResponse(cityResponse);

        setCountries(countryList);
        setStates(stateList);
        setCities(cityList);
        setSelectedCountry(company?.country ?? "");
        setSelectedState(company?.state ?? "");
        setSelectedCity(company?.city ?? "");
      } catch (loadError) {
        if (!cancelled) {
          toast.error(loadError instanceof Error ? loadError.message : 'Could not load location masters');
        }
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    }

    void loadLocations();
    return () => {
      cancelled = true;
    };
  }, [open, company]);

  const filteredStates = useMemo(
    () => states.filter((state) => (selectedCountry === "" ? true : state.country === Number(selectedCountry))),
    [states, selectedCountry],
  );

  const filteredCities = useMemo(
    () => cities.filter((city) => (selectedState === "" ? true : city.state === Number(selectedState))),
    [cities, selectedState],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data: CompanyInput = {
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      city: selectedCity === "" ? null : Number(selectedCity),
      state: selectedState === "" ? null : Number(selectedState),
      pincode: String(formData.get("pincode") ?? "").trim(),
      country: selectedCountry === "" ? null : Number(selectedCountry),
      gst_number: String(formData.get("gst_number") ?? "").trim(),
    };

    if (!data.name) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      if (company) await updateCompany(company.id, data);
      else await createCompany(data);
      await onSaved();
      onOpenChange(false);
      toast.success(company ? "Company updated." : "Company added.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{company ? "Edit company" : "Add company"}</DialogTitle>
          <DialogDescription>Company details and registration information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              Company name
              <Input name="name" required defaultValue={company?.name ?? ""} autoFocus />
            </label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              Address
              <Input name="address" defaultValue={company?.address ?? ""} />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Country
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCountry}
                onChange={(event) => {
                  const nextCountry = event.target.value === "" ? "" : Number(event.target.value);
                  setSelectedCountry(nextCountry);
                  setSelectedState("");
                  setSelectedCity("");
                }}
                disabled={loadingLocations}
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              State
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedState}
                onChange={(event) => {
                  const nextState = event.target.value === "" ? "" : Number(event.target.value);
                  setSelectedState(nextState);
                  setSelectedCity("");
                }}
                disabled={loadingLocations || !filteredStates.length}
              >
                <option value="">Select state</option>
                {filteredStates.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              City
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value === "" ? "" : Number(event.target.value))}
                disabled={loadingLocations || !filteredCities.length}
              >
                <option value="">Select city</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              PIN code
              <Input name="pincode" defaultValue={company?.pincode ?? ""} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              GST number
              <Input name="gst_number" defaultValue={company?.gst_number ?? ""} />
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingLocations}>
              {saving ? "Saving…" : company ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
