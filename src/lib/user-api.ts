import { request } from "@/lib/api";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: number | null;
  is_active: boolean;
}

export interface UserInput {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: number | null;
  is_active?: boolean;
  password?: string;
}

export interface Role {
  id: number;
  name: string;
  code: string;
}

export interface RoleInput {
  name?: string;
  code?: string;
}

export interface Module {
  id: number;
  name: string;
  code: string;
}

export interface ModuleInput {
  name?: string;
  code?: string;
}

export interface RolePermission {
  id: number;
  role: number;
  role_name: string;
  module: number;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface RolePermissionInput {
  role?: number;
  module?: number;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export async function listUsers(): Promise<User[]> {
  const response = await request<User[] | { results: User[] }>("/auth/users/");
  return Array.isArray(response) ? response : response.results;
}

export function createUser(data: UserInput): Promise<User> {
  return request<User>("/auth/users/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(id: number, data: UserInput): Promise<User> {
  return request<User>(`/auth/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: number): Promise<void> {
  return request<void>(`/auth/users/${id}/`, { method: "DELETE" });
}

export async function listRoles(): Promise<Role[]> {
  const response = await request<Role[] | { results: Role[] }>("/auth/roles/");
  return Array.isArray(response) ? response : response.results;
}

export function createRole(data: RoleInput): Promise<Role> {
  return request<Role>("/auth/roles/", { method: "POST", body: JSON.stringify(data) });
}

export function updateRole(id: number, data: RoleInput): Promise<Role> {
  return request<Role>(`/auth/roles/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteRole(id: number): Promise<void> {
  return request<void>(`/auth/roles/${id}/`, { method: "DELETE" });
}

export async function listModules(): Promise<Module[]> {
  const response = await request<Module[] | { results: Module[] }>("/auth/modules/");
  return Array.isArray(response) ? response : response.results;
}

export function createModule(data: ModuleInput): Promise<Module> {
  return request<Module>("/auth/modules/", { method: "POST", body: JSON.stringify(data) });
}

export function updateModule(id: number, data: ModuleInput): Promise<Module> {
  return request<Module>(`/auth/modules/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteModule(id: number): Promise<void> {
  return request<void>(`/auth/modules/${id}/`, { method: "DELETE" });
}

export async function listRolePermissions(): Promise<RolePermission[]> {
  const response = await request<RolePermission[] | { results: RolePermission[] }>(
    "/auth/role-permissions/",
  );
  return Array.isArray(response) ? response : response.results;
}

export function createRolePermission(data: RolePermissionInput): Promise<RolePermission> {
  return request<RolePermission>("/auth/role-permissions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRolePermission(
  id: number,
  data: RolePermissionInput,
): Promise<RolePermission> {
  return request<RolePermission>(`/auth/role-permissions/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteRolePermission(id: number): Promise<void> {
  return request<void>(`/auth/role-permissions/${id}/`, { method: "DELETE" });
}
