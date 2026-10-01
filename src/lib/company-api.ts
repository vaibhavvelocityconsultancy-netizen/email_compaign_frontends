import { request } from "@/lib/api";

export interface Country {
  id: number;
  name: string;
  code?: string | null;
  is_active?: boolean;
}

export interface State {
  id: number;
  name: string;
  country: number;
  is_active?: boolean;
}

export interface City {
  id: number;
  name: string;
  state: number;
  is_active?: boolean;
}

export interface Company {
  id: number;
  name: string;
  is_contact: boolean;
  address: string;
  city: number | null;
  city_name: string;
  state: number | null;
  state_name: string;
  pincode: string;
  country: number | null;
  country_name: string;
  gst_number: string;
  is_active: boolean;
  contacts_count: number;
  created_at: string;
}

export type CompanyInput = Pick<
  Company,
  "name" | "address" | "pincode" | "gst_number"
> & {
  city: number | null;
  state: number | null;
  country: number | null;
};

export interface CompanyContact {
  id: number;
  company: number;
  name: string;
  designation: string;
  phone: string;
  email: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export type CompanyContactInput = Pick<
  CompanyContact,
  "name" | "designation" | "phone" | "email" | "is_primary"
>;

interface ListResponse<T> {
  count: number;
  results: T[];
}

export async function listCompanies(): Promise<Company[]> {
  const response = await request<ListResponse<Company>>("/companies/");
  return response.results;
}

export function createCompany(data: CompanyInput): Promise<Company> {
  return request<Company>("/companies/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCompany(id: number, data: CompanyInput): Promise<Company> {
  return request<Company>(`/companies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function listCountries(): Promise<Country[]> {
  return request<Country[] | { results: Country[] }>("/countries/").then((response) =>
    Array.isArray(response) ? response : response.results,
  );
}

export function listStates(): Promise<State[]> {
  return request<State[] | { results: State[] }>("/states/").then((response) =>
    Array.isArray(response) ? response : response.results,
  );
}

export function listCities(): Promise<City[]> {
  return request<City[] | { results: City[] }>("/cities/").then((response) =>
    Array.isArray(response) ? response : response.results,
  );
}

export function listCompanyContacts(companyId: number): Promise<CompanyContact[]> {
  return request<CompanyContact[]>(`/companies/${companyId}/contacts/`);
}

export function createCompanyContact(
  companyId: number,
  data: CompanyContactInput,
): Promise<CompanyContact> {
  return request<CompanyContact>(`/companies/${companyId}/contacts/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCompanyContact(
  companyId: number,
  contactId: number,
  data: CompanyContactInput,
): Promise<CompanyContact> {
  return request<CompanyContact>(`/companies/${companyId}/contacts/${contactId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
