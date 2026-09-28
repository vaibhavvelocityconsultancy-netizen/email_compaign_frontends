import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Delete", loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} eyebrow="CONFIRM">
      <div className="p-5">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line bg-background/50 px-5 py-4">
        <button
          onClick={onClose}
          className="h-9 rounded-lg border border-line bg-surface px-4 text-sm transition-colors hover:bg-background"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
