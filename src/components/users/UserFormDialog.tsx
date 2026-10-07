import { useEffect, useState, type FormEvent } from "react";
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
import { createUser, updateUser, type User, type UserInput } from "@/lib/user-api";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSaved: () => void | Promise<void>;
}

interface UserFormState {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  password: string;
}

const emptyForm: UserFormState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "",
  is_active: true,
  password: "",
};

export function UserFormDialog({ open, onOpenChange, user, onSaved }: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      user
        ? {
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role === null ? "" : String(user.role),
            is_active: user.is_active,
            password: "",
          }
        : emptyForm,
    );
    setError("");
  }, [open, user]);

  function updateField<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const role = form.role.trim() ? Number(form.role) : null;
    if (role !== null && (!Number.isInteger(role) || role < 1)) {
      setError("Enter a valid role ID or leave the field blank.");
      return;
    }

    const data: UserInput = {
      username: form.username.trim(),
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      role,
      is_active: form.is_active,
    };
    if (!user || form.password) data.password = form.password;

    setSaving(true);
    try {
      if (user) await updateUser(user.id, data);
      else await createUser(data);
      await onSaved();
      onOpenChange(false);
      toast.success(user ? "User updated." : "User created.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {user ? "Update account details or set a new password." : "Create a user account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Username
              <Input
                required
                maxLength={150}
                autoComplete="username"
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Email
              <Input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              First name
              <Input
                maxLength={30}
                autoComplete="given-name"
                value={form.first_name}
                onChange={(event) => updateField("first_name", event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Last name
              <Input
                maxLength={30}
                autoComplete="family-name"
                value={form.last_name}
                onChange={(event) => updateField("last_name", event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Password{" "}
              {user && <span className="font-normal text-muted-foreground">(optional)</span>}
              <Input
                type="password"
                required={!user}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Role ID <span className="font-normal text-muted-foreground">(optional)</span>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField("is_active", event.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            Account is active
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : user ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
