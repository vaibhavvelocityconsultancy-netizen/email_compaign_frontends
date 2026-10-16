import * as React from "react";
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
import { createRole, updateRole, type Role } from "@/lib/user-api";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
  onSaved: (role: Role) => void | Promise<void>;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function RoleFormDialog({ open, onOpenChange, role = null, onSaved }: RoleFormDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [codeEdited, setCodeEdited] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setName(role?.name ?? "");
    setCode(role?.code ?? "");
    setCodeEdited(Boolean(role));
    setError("");
  }, [open, role]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      setError("Enter both a role name and code.");
      return;
    }

    setSaving(true);
    try {
      const savedRole = role
        ? await updateRole(role.id, { name: trimmedName, code: trimmedCode })
        : await createRole({ name: trimmedName, code: trimmedCode });
      await onSaved(savedRole);
      onOpenChange(false);
      toast.success(role ? "Role updated." : "Role created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "Create role"}</DialogTitle>
          <DialogDescription>
            {role
              ? "Update this role's name and unique code."
              : "Create a role that can be assigned access permissions."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            Role name
            <Input
              autoFocus
              required
              maxLength={50}
              placeholder="e.g. Sales Manager"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!codeEdited) setCode(slugify(nextName));
              }}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Role code
            <Input
              required
              maxLength={50}
              placeholder="e.g. sales-manager"
              value={code}
              onChange={(event) => {
                setCodeEdited(true);
                setCode(event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
              }}
            />
            <span className="block text-xs font-normal text-muted-foreground">
              Unique identifier used by the system.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : role ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
