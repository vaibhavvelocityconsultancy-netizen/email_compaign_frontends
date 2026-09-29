import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useForm, type DefaultValues, type FieldPath, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "textarea"
  | "select"
  | "searchable-select"
  | "multi-select"
  | "checkbox"
  | "date"
  | "currency"
  | "password"
  | "switch"
  | "name"
  | "time"
  | "row"
  | "file";

export interface SelectOption {
  value: string | boolean | number;
  label: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  className?: string;
  colSpan?: 1 | 2;
  defaultToToday?: boolean;
  readonly?: boolean;
  multiple?: boolean;
  key?: string;
  headerActions?: React.ReactNode;
  defaultValue?: string | number | boolean | unknown[];
  onOpenChange?: (open: boolean) => void;
  fields?: FormFieldConfig[];
  columns?: number;
  hidden?: (form: UseFormReturn<Record<string, unknown>>) => boolean;
}

export interface EntityFormProps<T extends Record<string, any>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormFieldConfig[];
  schema: z.ZodType<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => void | Promise<void>;
  isEdit?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  subHeader?: React.ReactNode;
  onValueChange?: (
    name: keyof T,
    value: unknown,
    setValue: UseFormReturn<T>["setValue"],
    getValues: UseFormReturn<T>["getValues"],
  ) => void;
  children?: React.ReactNode;
}

interface SavedFile {
  id: string | number;
  file_name?: string;
  file_url?: string;
  file?: string;
}

const sizeClasses: Record<NonNullable<EntityFormProps<Record<string, any>>["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

const gridColumnClasses: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

function toInputDate(value?: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function fromInputDate(value?: string): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function todayAsDateField(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${today.getFullYear()}`;
}

function SearchableSelectInput({
  label,
  placeholder,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value: unknown;
  disabled: boolean;
  onChange: (value: SelectOption["value"]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => String(option.value) === String(value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
        >
          <span className="truncate">{selected?.label ?? placeholder ?? `Select ${label.toLowerCase()}`}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={String(option.value)}
                  value={`${option.label} ${String(option.value)}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      String(value) === String(option.value) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EntityForm<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  fields,
  schema,
  defaultValues,
  onSubmit,
  isEdit = false,
  submitLabel,
  cancelLabel = "Cancel",
  isLoading = false,
  size = "md",
  onValueChange,
  children,
  headerActions,
  footerActions,
  subHeader,
}: EntityFormProps<T>) {
  const pendingFilesRef = React.useRef<Record<string, File[]>>({});
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
    mode: "onChange",
  });

  React.useEffect(() => {
    if (!open || !onValueChange) return;
    Object.entries(form.getValues()).forEach(([name, value]) => {
      onValueChange(name as keyof T, value, form.setValue, form.getValues);
    });
    const subscription = form.watch((values, state) => {
      const name = state.name;
      if (!name) return;
      onValueChange(name as keyof T, values[name], form.setValue, form.getValues);
    });
    return () => subscription.unsubscribe();
  }, [open, form, onValueChange]);

  React.useEffect(() => {
    if (!open) return;
    pendingFilesRef.current = {};
    if (isEdit && defaultValues) {
      form.reset(defaultValues as DefaultValues<T>);
      return;
    }

    const initialValues: Record<string, unknown> = { ...defaultValues };
    const applyDefaults = (items: FormFieldConfig[]) => {
      items.forEach((field) => {
        if (field.type === "row") {
          applyDefaults(field.fields ?? []);
          return;
        }
        if (initialValues[field.name] !== undefined) return;
        if (field.defaultValue !== undefined) initialValues[field.name] = field.defaultValue;
        else if (field.type === "number" || field.type === "currency") initialValues[field.name] = 0;
        else if (field.type === "switch" || field.type === "checkbox") initialValues[field.name] = false;
        else if (field.type === "date" && field.defaultToToday) initialValues[field.name] = todayAsDateField();
        else initialValues[field.name] = "";
      });
    };
    applyDefaults(fields);
    form.reset(initialValues as DefaultValues<T>);
  }, [open, isEdit]);

  const renderFileField = (
    config: FormFieldConfig,
    fieldValue: unknown,
    onChange: (value: unknown) => void,
    disabled: boolean,
  ) => {
    const savedFiles = Array.isArray(fieldValue)
      ? (fieldValue.filter((item) => Boolean(item && typeof item === "object" && "id" in item)) as SavedFile[])
      : [];
    const pendingFiles = pendingFilesRef.current[config.name] ?? [];
    const updateFiles = (files: File[]) => {
      pendingFilesRef.current[config.name] = files;
      onChange([...savedFiles, ...files]);
    };

    return (
      <div className="space-y-2">
        {savedFiles.length > 0 && (
          <div className="space-y-1 rounded-md border border-border bg-muted/40 p-2">
            {savedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs">{file.file_name ?? "Saved attachment"}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {(file.file_url || file.file) && (
                    <a
                      href={file.file_url ?? file.file}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${file.file_name ?? "attachment"}`}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                    onClick={() => onChange([...savedFiles.filter((item) => item.id !== file.id), ...pendingFiles])}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="space-y-1 rounded-md border border-border bg-brand-soft p-2">
            <p className="text-xs font-medium text-muted-foreground">{pendingFiles.length} selected</p>
            {pendingFiles.map((file, index) => (
              <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                  onClick={() => updateFiles(pendingFiles.filter((_, fileIndex) => fileIndex !== index))}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          id={`entity-file-${config.name}`}
          type="file"
          multiple={config.multiple}
          disabled={disabled || isLoading}
          className="sr-only"
          onClick={(event) => { event.currentTarget.value = ""; }}
          onChange={(event) => {
            const chosen = Array.from(event.currentTarget.files ?? []);
            if (!config.multiple) {
              updateFiles(chosen.slice(0, 1));
              return;
            }
            const existing = pendingFilesRef.current[config.name] ?? [];
            const next = [...existing];
            chosen.forEach((file) => {
              if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file);
            });
            updateFiles(next);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          onClick={() => document.getElementById(`entity-file-${config.name}`)?.click()}
        >
          <Plus className="size-4" />
          {config.multiple ? "Add attachments" : "Choose file"}
        </Button>
      </div>
    );
  };

  const renderField = (config: FormFieldConfig): React.ReactNode => {
    if (config.hidden?.(form as UseFormReturn<Record<string, unknown>>)) return null;

    if (config.type === "row") {
      const columns = Math.max(1, Math.min(config.columns ?? 2, 6));
      return (
        <div
          key={config.key ?? config.name}
          className={cn("col-span-full grid grid-cols-1 gap-4 sm:gap-5", gridColumnClasses[columns], config.className)}
        >
          {(config.fields ?? []).map(renderField)}
        </div>
      );
    }

    const {
      name,
      label,
      type,
      placeholder,
      description,
      required,
      disabled = false,
      options = [],
      min,
      max,
      step,
      rows,
      colSpan = 1,
    } = config;

    return (
      <FormField
        key={config.key ?? name}
        control={form.control}
        name={name as FieldPath<T>}
        render={({ field }) => {
          const fieldDisabled = disabled || isLoading;
          const value = field.value;
          const update = (next: unknown) => field.onChange(next);

          return (
            <FormItem className={cn("min-w-0 space-y-2", colSpan === 2 && "col-span-full", config.className)}>
              <div className="flex min-w-0 items-center gap-2">
                <FormLabel>
                  {label}
                  {required && <span className="ml-1 text-destructive">*</span>}
                </FormLabel>
                {config.headerActions}
              </div>
              <FormControl>
                <>
                  {(type === "text" || type === "name" || type === "email" || type === "tel" || type === "password") && (
                    <Input
                      type={type === "name" ? "text" : type}
                      placeholder={placeholder}
                      disabled={fieldDisabled}
                      value={String(value ?? "")}
                      onChange={(event) => update(event.target.value)}
                    />
                  )}
                  {(type === "number" || type === "currency") && (
                    <Input
                      type="number"
                      placeholder={placeholder}
                      disabled={fieldDisabled}
                      min={min}
                      max={max}
                      step={step ?? 1}
                      value={value === undefined || value === null ? "" : (value as number | string)}
                      onChange={(event) => update(event.target.value === "" ? "" : Number(event.target.value))}
                      readOnly={config.readonly}
                    />
                  )}
                  {type === "textarea" && (
                    <Textarea
                      placeholder={placeholder}
                      disabled={fieldDisabled}
                      rows={rows ?? 3}
                      value={String(value ?? "")}
                      onChange={(event) => update(event.target.value)}
                    />
                  )}
                  {type === "file" && renderFileField(config, value, update, disabled)}
                  {type === "date" && (
                    <Input
                      type="date"
                      placeholder={placeholder}
                      disabled={fieldDisabled}
                      value={toInputDate(typeof value === "string" ? value : "")}
                      onChange={(event) => update(fromInputDate(event.target.value))}
                    />
                  )}
                  {type === "time" && (
                    <Input
                      type="time"
                      placeholder={placeholder}
                      disabled={fieldDisabled}
                      value={String(value ?? "")}
                      onChange={(event) => update(event.target.value)}
                    />
                  )}
                  {type === "select" && (
                    <Select
                      value={value === undefined || value === null ? "" : String(value)}
                      onValueChange={(selected) => {
                        const option = options.find((item) => String(item.value) === selected);
                        update(option?.value ?? selected);
                      }}
                      onOpenChange={config.onOpenChange}
                      disabled={fieldDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={placeholder ?? `Select ${label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={String(option.value)} value={String(option.value)}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {type === "searchable-select" && (
                    <SearchableSelectInput
                      label={label}
                      placeholder={placeholder}
                      options={options}
                      value={value}
                      disabled={fieldDisabled}
                      onChange={update}
                    />
                  )}
                  {type === "multi-select" && (
                    <div className="space-y-2">
                      {options.map((option) => {
                        const values = Array.isArray(value) ? value : [];
                        const checked = values.some((item) => String(item) === String(option.value));
                        return (
                          <label key={String(option.value)} className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              disabled={fieldDisabled}
                              onCheckedChange={(isChecked) => update(
                                isChecked
                                  ? [...values, option.value]
                                  : values.filter((item) => String(item) !== String(option.value)),
                              )}
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {type === "checkbox" && (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={Boolean(value)} onCheckedChange={update} disabled={fieldDisabled} />
                      {placeholder && <span className="text-muted-foreground">{placeholder}</span>}
                    </label>
                  )}
                  {type === "switch" && (
                    <div className="flex items-center gap-2">
                      <Switch checked={Boolean(value)} onCheckedChange={update} disabled={fieldDisabled} />
                      {placeholder && <span className="text-sm text-muted-foreground">{placeholder}</span>}
                    </div>
                  )}
                </>
              </FormControl>
              {description && <FormDescription>{description}</FormDescription>}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-2rem)] gap-0 p-5 sm:p-6",
          sizeClasses[size],
          size === "full" && "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden",
        )}
      >
        <DialogHeader className="shrink-0">
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          <DialogTitle className="pr-8">{title}</DialogTitle>
          {subHeader}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await onSubmit(values);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save this item");
              }
            }, (errors) => {
              const firstError = Object.entries(errors)[0];
              if (!firstError) {
                toast.error("Please check the required fields");
                return;
              }
              const [name, error] = firstError;
              const message = error && "message" in error ? error.message : undefined;
              toast.error(typeof message === "string" ? message : "Please check the required fields");
              document.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)?.focus();
            })}
            className={cn("mt-5 space-y-5", size === "full" && "flex min-h-0 flex-1 flex-col overflow-hidden")}
          >
            <div className={cn("grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5", size === "full" && "min-h-0 flex-1 overflow-y-auto px-1")}>
              {fields.map(renderField)}
              {children}
            </div>
            {footerActions ? (
              <DialogFooter className="w-full shrink-0 justify-between gap-2 border-t border-border pt-4 sm:flex-row">
                <div className="flex flex-wrap items-center gap-2">{footerActions}</div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    {cancelLabel}
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : submitLabel ?? (isEdit ? "Update" : "Create")}
                  </Button>
                </div>
              </DialogFooter>
            ) : (
              <DialogFooter className="shrink-0 gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                  {cancelLabel}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : submitLabel ?? (isEdit ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const fieldPresets = {
  file: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "file", ...options }),
  text: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "text", ...options }),
  email: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "email", placeholder: "name@example.com", ...options }),
  phone: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "tel", placeholder: "Phone number", ...options }),
  currency: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "currency", placeholder: "0", min: 0, ...options }),
  select: (name: string, label: string, optionsList: SelectOption[], options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "select", options: optionsList, ...options }),
  searchableSelect: (name: string, label: string, optionsList: SelectOption[], options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "searchable-select", options: optionsList, ...options }),
  multiSelect: (name: string, label: string, optionsList: SelectOption[], options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "multi-select", options: optionsList, colSpan: 2, ...options }),
  checkbox: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "checkbox", ...options }),
  time: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "time", ...options }),
  textarea: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "textarea", rows: 3, colSpan: 2, ...options }),
  date: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "date", ...options }),
  password: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "password", placeholder: "Enter password", ...options }),
  number: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "number", ...options }),
  switch: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "switch", ...options }),
  name: (name: string, label: string, options?: Partial<FormFieldConfig>): FormFieldConfig => ({ name, label, type: "name", ...options }),
  row: (fields: FormFieldConfig[], columns: number = 2): FormFieldConfig => ({ name: `row-${fields.map((field) => field.name).join("-")}`, label: "", type: "row", fields, columns, colSpan: 2 }),
};