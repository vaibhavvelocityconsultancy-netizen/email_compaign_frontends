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
import { createCompanyContact, listCompanyContacts, type Company, type CompanyContact } from "@/lib/company-api";

interface CompanyContactsDialogProps {
  company: Company | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}

export function CompanyContactsDialog({ company, onOpenChange, onChanged }: CompanyContactsDialogProps) {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!company) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    listCompanyContacts(company.id)
      .then((results) => {
        if (active) setContacts(results);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load contacts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [company]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: String(formData.get("name") ?? "").trim(),
      designation: String(formData.get("designation") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      is_primary: formData.get("is_primary") === "on",
    };
    if (!data.name) {
      setError("Contact name is required.");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await createCompanyContact(company.id, data);
      setContacts(await listCompanyContacts(company.id));
      form.reset();
      await onChanged();
      toast.success("Contact added.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save contact.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(company)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{company ? `${company.name} contacts` : "Company contacts"}</DialogTitle>
          <DialogDescription>Manage the people associated with this company.</DialogDescription>
        </DialogHeader>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading contacts…</p>
          ) : contacts.length ? (
            contacts.map((contact) => (
              <div key={contact.id} className="flex flex-wrap items-start justify-between gap-3 border-b py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[contact.designation, contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                {contact.is_primary && <span className="text-xs text-primary">Primary</span>}
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No contacts added yet.</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Add contact</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="name" aria-label="Contact name" placeholder="Name" required />
            <Input name="designation" aria-label="Designation" placeholder="Designation" />
            <Input name="email" aria-label="Email" type="email" placeholder="Email" />
            <Input name="phone" aria-label="Phone" type="tel" placeholder="Phone" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={saving || !company}>
              {saving ? "Saving…" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
