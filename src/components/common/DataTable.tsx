import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ListFilter,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "list" | "date";
  className?: string;
  headerClassName?: string;
  filterValue?: (row: T) => string | number | Date | null | undefined;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  getRowClassName?: (row: T) => string;
  toolbarActions?: React.ReactNode;
  selectionSummary?: React.ReactNode;
  onFilteredDataChange?: (data: T[]) => void;
  onSelectionChange?: (selected: T[]) => void;
  selectable?: boolean;
  isRowSelectable?: (row: T) => boolean;
  selectionResetKey?: string | number;
  storageKey?: string;
  userId?: string;
}

type DateRange = { from?: Date | undefined; to?: Date | undefined };
type SavedTableState = {
  searchQuery?: string;
  currentPage?: number;
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc";
  columnFilters?: Record<string, string[]>;
  dateRangeFilters?: Record<string, { from?: string | null; to?: string | null }>;
};

function DateRangeFilterDropdown({
  columnKey,
  activeDateRange,
  onDateRangeChange,
}: {
  columnKey: string;
  activeDateRange: DateRange;
  onDateRangeChange: (key: string, range: DateRange) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange>(activeDateRange);
  const hasActiveFilter = Boolean(activeDateRange.from || activeDateRange.to);

  React.useEffect(() => {
    if (open) setRange(activeDateRange);
  }, [open, activeDateRange.from, activeDateRange.to]);

  const formatDate = (date?: Date) =>
    date?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter ${columnKey} by date`}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            hasActiveFilter && "text-primary",
          )}
        >
          <CalendarDays className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-2rem)] p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Filter by date</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  onDateRangeChange(columnKey, {});
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onDateRangeChange(columnKey, range);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(value) => setRange({ from: value?.from, to: value?.to })}
            numberOfMonths={1}
            initialFocus
          />
          {(range.from || range.to) && (
            <p className="text-center text-xs text-muted-foreground">
              {formatDate(range.from)}{range.to ? ` - ${formatDate(range.to)}` : ""}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnFilterDropdown<T>({
  column,
  data,
  activeFilters,
  onFilterChange,
}: {
  column: Column<T>;
  data: T[];
  activeFilters: Set<string> | undefined;
  onFilterChange: (key: string, values?: Set<string>) => void;
}) {
  const [filterSearch, setFilterSearch] = React.useState("");
  const [localSelected, setLocalSelected] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState(false);

  const uniqueValues = React.useMemo(() => {
    const values = new Set<string>();
    data.forEach((row) => {
      const value = column.filterValue
        ? column.filterValue(row)
        : (row as Record<string, unknown>)[column.key];
      if (value !== null && value !== undefined) values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [column, data]);

  const filteredValues = React.useMemo(() => {
    const query = filterSearch.trim().toLowerCase();
    return query ? uniqueValues.filter((value) => value.toLowerCase().includes(query)) : uniqueValues;
  }, [filterSearch, uniqueValues]);

  React.useEffect(() => {
    if (open) {
      setLocalSelected(new Set(activeFilters ?? uniqueValues));
      setFilterSearch("");
    }
  }, [open, activeFilters, uniqueValues]);

  const allSelected = uniqueValues.length > 0 && localSelected.size === uniqueValues.length;
  const hasActiveFilter = activeFilters !== undefined && activeFilters.size < uniqueValues.length;

  const toggleValue = (value: string) => {
    setLocalSelected((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const apply = () => {
    onFilterChange(column.key, allSelected || localSelected.size === 0 ? undefined : new Set(localSelected));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter ${column.header}`}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            hasActiveFilter && "text-primary",
          )}
        >
          <ListFilter className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={`Search ${column.header} values`}
              placeholder="Search values"
              value={filterSearch}
              onChange={(event) => setFilterSearch(event.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={allSelected}
          onClick={() => setLocalSelected(allSelected ? new Set() : new Set(uniqueValues))}
          className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/60"
        >
          <span className="grid size-4 place-items-center rounded-[3px] border border-input bg-background" aria-hidden="true">
            {allSelected && <Check className="size-3 text-primary" />}
          </span>
          <span className="font-medium text-muted-foreground">Select all</span>
        </button>
        <div className="max-h-48 overflow-y-auto p-1">
          {filteredValues.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">No matches</p>
          ) : (
            filteredValues.map((value) => (
              <button
                key={value}
                type="button"
                role="checkbox"
                aria-checked={localSelected.has(value)}
                onClick={() => toggleValue(value)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                <span className="grid size-4 place-items-center rounded-[3px] border border-input bg-background" aria-hidden="true">
                  {localSelected.has(value) && <Check className="size-3 text-primary" />}
                </span>
                <span className="truncate">{value}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-2 border-t p-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1"
            onClick={() => {
              onFilterChange(column.key);
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button size="sm" className="h-8 flex-1" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnSelectorDropdown<T>({
  columns,
  visibleKeys,
  onVisibilityChange,
}: {
  columns: Column<T>[];
  visibleKeys: Set<string>;
  onVisibilityChange: (keys: Set<string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selectableColumns = columns.filter((column) => column.key !== "actions");
  const allVisible = selectableColumns.every((column) => visibleKeys.has(column.key));

  const toggle = (key: string) => {
    const next = new Set(visibleKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onVisibilityChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <button
          type="button"
          role="checkbox"
          aria-checked={allVisible}
          onClick={() =>
            onVisibilityChange(
              allVisible
                ? new Set(columns.filter((column) => column.key === "actions").map((column) => column.key))
                : new Set(columns.map((column) => column.key)),
            )
          }
          className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/60"
        >
          <span className="grid size-4 place-items-center rounded-[3px] border border-input bg-background" aria-hidden="true">
            {allVisible && <Check className="size-3 text-primary" />}
          </span>
          <span className="font-medium text-muted-foreground">All columns</span>
        </button>
        <ScrollArea className="max-h-80">
          {selectableColumns.map((column) => (
            <button
              key={column.key}
              type="button"
              role="checkbox"
              aria-checked={visibleKeys.has(column.key)}
              onClick={() => toggle(column.key)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
            >
              <span className="grid size-4 place-items-center rounded-[3px] border border-input bg-background" aria-hidden="true">
                {visibleKeys.has(column.key) && <Check className="size-3 text-primary" />}
              </span>
              <span className="truncate">{column.header}</span>
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function safeReadSessionState(key: string | null): SavedTableState | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved ? (JSON.parse(saved) as SavedTableState) : null;
  } catch {
    return null;
  }
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sortValue(value: unknown): number | string {
  const date = dateValue(value);
  if (date) return date.getTime();
  if (typeof value === "number") return value;
  return String(value ?? "").toLocaleLowerCase();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function pageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (currentPage > 3) pages.push("ellipsis");
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page++) {
    pages.push(page);
  }
  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  searchPlaceholder = "Search",
  searchKeys = [],
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  emptyMessage = "No records found.",
  getRowClassName,
  toolbarActions,
  selectionSummary,
  onFilteredDataChange,
  onSelectionChange,
  selectable = false,
  isRowSelectable,
  selectionResetKey,
  storageKey,
  userId,
}: DataTableProps<T>) {
  const safeData = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string | number>>(new Set());
  const [searchQuery, setSearchQueryState] = React.useState("");
  const [currentPage, setCurrentPageState] = React.useState(1);
  const [pageSize, setPageSizeState] = React.useState(Math.max(1, initialPageSize));
  const [sortKey, setSortKeyState] = React.useState<string | null>(null);
  const [sortDirection, setSortDirectionState] = React.useState<"asc" | "desc">("asc");
  const [columnFilters, setColumnFilters] = React.useState<Record<string, Set<string>>>({});
  const [dateRangeFilters, setDateRangeFilters] = React.useState<Record<string, DateRange>>({});
  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(
    () => new Set(columns.map((column) => column.key)),
  );
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const element = scrollRef.current;
      if (!element) return;
      event.preventDefault();
      element.scrollBy({ left: event.key === "ArrowRight" ? 150 : -150, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const columnStorageKey = storageKey
    ? `col-vis:${userId ? `${userId}:` : ""}${storageKey}`
    : null;
  const filterStorageKey = storageKey ? `filter-state:${storageKey}` : null;

  React.useEffect(() => {
    if (columnStorageKey) {
      try {
        const saved = window.localStorage.getItem(columnStorageKey);
        if (saved) {
          const keys = JSON.parse(saved) as string[];
          const validKeys = new Set(columns.map((column) => column.key));
          setVisibleKeys(new Set(keys.filter((key) => validKeys.has(key))));
        }
      } catch {
        setVisibleKeys(new Set(columns.map((column) => column.key)));
      }
    }

    const saved = safeReadSessionState(filterStorageKey);
    if (!saved) return;
    if (typeof saved.searchQuery === "string") setSearchQueryState(saved.searchQuery);
    if (typeof saved.currentPage === "number" && saved.currentPage > 0) {
      setCurrentPageState(saved.currentPage);
    }
    if (typeof saved.pageSize === "number" && saved.pageSize > 0) setPageSizeState(saved.pageSize);
    if (typeof saved.sortKey === "string" || saved.sortKey === null) setSortKeyState(saved.sortKey);
    if (saved.sortDirection === "asc" || saved.sortDirection === "desc") {
      setSortDirectionState(saved.sortDirection);
    }
    if (saved.columnFilters) {
      setColumnFilters(
        Object.fromEntries(Object.entries(saved.columnFilters).map(([key, values]) => [key, new Set(values)])),
      );
    }
    if (saved.dateRangeFilters) {
      setDateRangeFilters(
        Object.fromEntries(
          Object.entries(saved.dateRangeFilters).map(([key, range]) => [
            key,
            {
              ...(range.from ? { from: new Date(range.from) } : {}),
              ...(range.to ? { to: new Date(range.to) } : {}),
            },
          ]),
        ),
      );
    }
  }, [columnStorageKey, filterStorageKey]);

  const persistState = (patch: Partial<SavedTableState>) => {
    if (!filterStorageKey || typeof window === "undefined") return;
    const current = safeReadSessionState(filterStorageKey) ?? {};
    try {
      window.sessionStorage.setItem(filterStorageKey, JSON.stringify({ ...current, ...patch }));
    } catch {
      return;
    }
  };

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [selectionResetKey]);

  const updateSearch = (value: string) => {
    setSearchQueryState(value);
    setCurrentPageState(1);
    setSelectedIds(new Set());
    persistState({ searchQuery: value, currentPage: 1 });
  };

  const searchFilteredData = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query || searchKeys.length === 0) return safeData;
    return safeData.filter((row) =>
      searchKeys.some((key) => {
        const value = row[key];
        return (typeof value === "string" || typeof value === "number") &&
          String(value).toLocaleLowerCase().includes(query);
      }),
    );
  }, [safeData, searchQuery, searchKeys]);

  const filteredData = React.useMemo(() => {
    const listFilterKeys = Object.keys(columnFilters);
    const dateFilterKeys = Object.keys(dateRangeFilters);
    if (listFilterKeys.length === 0 && dateFilterKeys.length === 0) return searchFilteredData;

    return searchFilteredData.filter((row) => {
      const passesListFilters = listFilterKeys.every((key) => {
        const column = columns.find((item) => item.key === key);
        const value = column?.filterValue
          ? column.filterValue(row)
          : (row as Record<string, unknown>)[key];
        return value !== null && value !== undefined && columnFilters[key]?.has(String(value));
      });

      const passesDateFilters = dateFilterKeys.every((key) => {
        const column = columns.find((item) => item.key === key);
        const value = column?.filterValue
          ? column.filterValue(row)
          : (row as Record<string, unknown>)[key];
        const date = dateValue(value);
        if (!date) return false;

        const { from, to } = dateRangeFilters[key] ?? {};
        const dateTime = date.getTime();
        if (from) {
          const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
          if (dateTime < start) return false;
        }
        if (to) {
          const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getTime();
          if (dateTime >= end) return false;
        }
        return true;
      });

      return passesListFilters && passesDateFilters;
    });
  }, [searchFilteredData, columnFilters, dateRangeFilters, columns]);

  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    const column = columns.find((item) => item.key === sortKey);
    return [...filteredData].sort((left, right) => {
      const leftValue = column?.filterValue
        ? column.filterValue(left)
        : (left as Record<string, unknown>)[sortKey];
      const rightValue = column?.filterValue
        ? column.filterValue(right)
        : (right as Record<string, unknown>)[sortKey];
      const a = sortValue(leftValue);
      const b = sortValue(rightValue);
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  React.useEffect(() => {
    onFilteredDataChange?.(sortedData);
  }, [sortedData, onFilteredDataChange]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const displayedPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const visiblePageNumbers = pageNumbers(displayedPage, totalPages);
  const startIndex = (displayedPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);
  const visibleColumns = columnStorageKey
    ? columns.filter((column) => visibleKeys.has(column.key))
    : columns;
  const selectableRows = sortedData.filter((row) => isRowSelectable?.(row) !== false);
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.id));
  const someSelected = !allSelected && selectableRows.some((row) => selectedIds.has(row.id));
  const checkboxState: boolean | "indeterminate" = allSelected ? true : someSelected ? "indeterminate" : false;
  const hasAnyFilter = Boolean(
    searchQuery.trim() || Object.keys(columnFilters).length || Object.keys(dateRangeFilters).length,
  );

  React.useEffect(() => {
    onSelectionChange?.(
      sortedData.filter((row) => selectedIds.has(row.id) && isRowSelectable?.(row) !== false),
    );
  }, [selectedIds, sortedData, isRowSelectable, onSelectionChange]);

  const changeListFilter = (key: string, values?: Set<string>) => {
    setColumnFilters((current) => {
      const next = { ...current };
      if (values === undefined) delete next[key];
      else next[key] = values;
      persistState({ columnFilters: Object.fromEntries(Object.entries(next).map(([name, set]) => [name, [...set]])) });
      return next;
    });
    setCurrentPageState(1);
    setSelectedIds(new Set());
  };

  const changeDateFilter = (key: string, range: DateRange) => {
    setDateRangeFilters((current) => {
      const next = { ...current };
      if (!range.from && !range.to) delete next[key];
      else next[key] = range;
      persistState({
        dateRangeFilters: Object.fromEntries(
          Object.entries(next).map(([name, value]) => [
            name,
            { from: value.from?.toISOString() ?? null, to: value.to?.toISOString() ?? null },
          ]),
        ),
      });
      return next;
    });
    setCurrentPageState(1);
    setSelectedIds(new Set());
  };

  const changeVisibility = (keys: Set<string>) => {
    setVisibleKeys(keys);
    if (!columnStorageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(columnStorageKey, JSON.stringify([...keys]));
    } catch {
      return;
    }
  };

  const toggleSort = (key: string) => {
    const direction = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    const nextKey = sortKey === key ? key : key;
    setSortKeyState(nextKey);
    setSortDirectionState(direction);
    persistState({ sortKey: nextKey, sortDirection: direction });
  };

  const toggleRow = (id: string | number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFilteredRows = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) selectableRows.forEach((row) => next.delete(row.id));
      else selectableRows.forEach((row) => next.add(row.id));
      return next;
    });
  };

  const setPage = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPageState(next);
    persistState({ currentPage: next });
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setDateRangeFilters({});
    setSearchQueryState("");
    setSortKeyState(null);
    setSortDirectionState("asc");
    setCurrentPageState(1);
    setSelectedIds(new Set());
    if (filterStorageKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(filterStorageKey);
      } catch {
        return;
      }
    }
  };

  const pageOptions = pageSizeOptions.filter((size) => Number.isFinite(size) && size > 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchKeys.length > 0 && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => updateSearch(event.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {toolbarActions}
          {columnStorageKey && (
            <ColumnSelectorDropdown
              columns={columns}
              visibleKeys={visibleKeys}
              onVisibilityChange={changeVisibility}
            />
          )}
        </div>
      </div>

      {selectionSummary}

      {(hasAnyFilter || sortKey) && (
        <div className="flex flex-wrap items-center gap-2">
          {sortKey && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground">
              Sort: <strong>{columns.find((column) => column.key === sortKey)?.header ?? sortKey}</strong>
              {sortDirection === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              <button
                type="button"
                aria-label="Clear sort"
                onClick={() => {
                  setSortKeyState(null);
                  setSortDirectionState("asc");
                  persistState({ sortKey: null, sortDirection: "asc" });
                }}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-brand-soft px-2 py-1 text-xs text-foreground">
              Search: <strong>{searchQuery}</strong>
              <button type="button" aria-label="Clear search" onClick={() => updateSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          )}
          {Object.entries(columnFilters).map(([key, values]) => {
            const column = columns.find((item) => item.key === key);
            const selected = [...values];
            return (
              <span key={key} className="inline-flex items-center gap-1 rounded-md border border-border bg-brand-soft px-2 py-1 text-xs text-foreground">
                {column?.header ?? key}: <strong>{selected.length === 1 ? selected[0] : `${selected.length} selected`}</strong>
                <button type="button" aria-label={`Clear ${column?.header ?? key} filter`} onClick={() => changeListFilter(key)} className="ml-1 text-muted-foreground hover:text-foreground">
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
          {Object.entries(dateRangeFilters).map(([key, range]) => {
            const column = columns.find((item) => item.key === key);
            return (
              <span key={key} className="inline-flex items-center gap-1 rounded-md border border-border bg-brand-soft px-2 py-1 text-xs text-foreground">
                {column?.header ?? key}: <strong>{range.from ? formatDate(range.from) : ""}{range.to ? ` - ${formatDate(range.to)}` : ""}</strong>
                <button type="button" aria-label={`Clear ${column?.header ?? key} date filter`} onClick={() => changeDateFilter(key, {})} className="ml-1 text-muted-foreground hover:text-foreground">
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
          <Button variant="link" size="sm" className="h-auto px-1 text-xs text-destructive" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div ref={scrollRef} className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10 px-3">
                    <Checkbox checked={checkboxState} onCheckedChange={toggleAllFilteredRows} aria-label="Select all filtered rows" />
                  </TableHead>
                )}
                {visibleColumns.map((column) => {
                  const sortable = column.sortable !== false && column.key !== "actions";
                  const filterable = column.filterable !== false && column.key !== "actions";
                  return (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold sm:px-4 sm:py-3 sm:text-sm",
                        column.className,
                        column.headerClassName,
                        sortable && "cursor-pointer select-none hover:bg-muted/60",
                      )}
                      onClick={() => sortable && toggleSort(column.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{column.header}</span>
                        {sortable && (sortKey === column.key
                          ? sortDirection === "asc" ? <ArrowUp className="size-3.5 shrink-0 text-muted-foreground" /> : <ArrowDown className="size-3.5 shrink-0 text-muted-foreground" />
                          : <ArrowDown className="size-3.5 shrink-0 text-muted-foreground/50" />)}
                        {filterable && (column.filterType === "date"
                          ? <DateRangeFilterDropdown columnKey={column.key} activeDateRange={dateRangeFilters[column.key] ?? {}} onDateRangeChange={changeDateFilter} />
                          : <ColumnFilterDropdown column={column} data={safeData} activeFilters={columnFilters[column.key]} onFilterChange={changeListFilter} />)}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="h-24 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : paginatedData.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(getRowClassName?.(row), selectedIds.has(row.id) && "bg-brand-soft hover:bg-brand-soft")}
                >
                  {selectable && (
                    <TableCell className="w-10 px-3">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        disabled={isRowSelectable?.(row) === false}
                        onCheckedChange={() => toggleRow(row.id)}
                        aria-label={`Select row ${row.id}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((column) => (
                    <TableCell key={column.key} className={cn("px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm", column.className)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const next = Number(value);
              setPageSizeState(next);
              setCurrentPageState(1);
              persistState({ pageSize: next, currentPage: 1 });
            }}
          >
            <SelectTrigger className="h-8 w-[76px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageOptions.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs text-muted-foreground sm:text-sm">
            {sortedData.length === 0 ? "0 of 0" : `${startIndex + 1}-${Math.min(startIndex + pageSize, sortedData.length)} of ${sortedData.length}`}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(1)} disabled={displayedPage === 1} aria-label="First page">
              <ChevronsLeft />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(displayedPage - 1)} disabled={displayedPage === 1} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            {visiblePageNumbers.map((page, index) => page === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">...</span>
            ) : (
              <Button
                key={page}
                variant={displayedPage === page ? "default" : "outline"}
                size="icon"
                className="size-8 text-xs"
                onClick={() => setPage(page)}
                aria-label={`Page ${page}`}
                aria-current={displayedPage === page ? "page" : undefined}
              >
                {page}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(displayedPage + 1)} disabled={displayedPage >= totalPages || totalPages === 0} aria-label="Next page">
              <ChevronRight />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(totalPages)} disabled={displayedPage >= totalPages || totalPages === 0} aria-label="Last page">
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}