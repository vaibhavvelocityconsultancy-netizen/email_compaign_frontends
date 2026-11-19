import { useEffect, useRef, useState } from "react";
import { Bold, ImagePlus, Italic, Trash2, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

function editorHtml(value: string): string {
  if (/<(p|br|div|strong|b|em|i|u|ul|ol|li|a|img)\b/i.test(value)) return value;
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

export function RichEmailBodyEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const lastValueRef = useRef<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageWidth, setImageWidth] = useState(100);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== lastValueRef.current) {
      editor.innerHTML = editorHtml(value);
      lastValueRef.current = value;
    }
  }, [value]);

  const emitHtml = (html: string) => {
    lastValueRef.current = html;
    onChange(html);
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      rangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selection && rangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(rangeRef.current);
    }
  };

  const insertImage = (dataUrl: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    const image = document.createElement("img");
    image.src = dataUrl;
    image.alt = "";
    image.style.width = "100%";
    image.style.maxWidth = "100%";
    image.style.height = "auto";
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(image);
      setSelectedImage(image);
      setImageWidth(100);
      range.setStartAfter(image);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      rangeRef.current = range.cloneRange();
    } else {
      editor.append(image);
      setSelectedImage(image);
      setImageWidth(100);
    }
    emitHtml(editor.innerHTML);
  };

  const readImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") insertImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const runCommand = (command: string) => {
    restoreSelection();
    document.execCommand(command);
    if (editorRef.current) emitHtml(editorRef.current.innerHTML);
    rememberSelection();
  };

  return (
    <div className="overflow-hidden rounded-md border border-input">
      <div className="flex items-center gap-1 border-b border-input bg-muted/40 p-1">
        <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled} aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}><Bold className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled} aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}><Italic className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled} aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("underline")}><Underline className="size-4" /></Button>
        <Button type="button" variant="outline" size="sm" className="h-8" disabled={disabled} onMouseDown={(event) => { rememberSelection(); event.preventDefault(); }} onClick={() => fileRef.current?.click()}><ImagePlus className="mr-1.5 size-4" />Insert image</Button>
        {selectedImage && (
          <>
            <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
              Image width
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={imageWidth}
                disabled={disabled}
                aria-label="Selected image width percentage"
                className="w-24 accent-primary"
                onChange={(event) => {
                  const width = Number(event.target.value);
                  setImageWidth(width);
                  selectedImage.style.width = `${width}%`;
                  if (editorRef.current) emitHtml(editorRef.current.innerHTML);
                }}
              />
              <span className="w-9">{imageWidth}%</span>
            </label>
            <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" disabled={disabled} aria-label="Remove selected image" title="Remove image" onClick={() => {
              selectedImage.remove();
              setSelectedImage(null);
              editorRef.current?.focus();
              if (editorRef.current) emitHtml(editorRef.current.innerHTML);
            }}><Trash2 className="size-4" /></Button>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) readImage(file); event.currentTarget.value = ""; }} />
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        data-placeholder={placeholder}
        className="min-h-40 px-3 py-2 text-sm outline-none [&:empty:before]:pointer-events-none [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)]"
        onInput={(event) => emitHtml(event.currentTarget.innerHTML)}
        onKeyUp={rememberSelection}
        onKeyDown={(event) => {
          if (selectedImage && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault();
            selectedImage.remove();
            setSelectedImage(null);
            emitHtml(event.currentTarget.innerHTML);
          }
        }}
        onMouseUp={rememberSelection}
        onFocus={rememberSelection}
        onClick={(event) => {
          const target = event.target;
          if (target instanceof HTMLImageElement) {
            setSelectedImage(target);
            const width = Number.parseInt(target.style.width, 10);
            setImageWidth(Number.isFinite(width) ? Math.min(100, Math.max(10, width)) : 100);
          } else {
            setSelectedImage(null);
          }
        }}
        onPaste={(event) => {
          const image = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
          if (image) {
            event.preventDefault();
            rememberSelection();
            const file = image.getAsFile();
            if (file) readImage(file);
          } else {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
            emitHtml(event.currentTarget.innerHTML);
          }
        }}
      />
      <p className="border-t border-input px-3 py-1.5 text-xs text-muted-foreground">Paste an image or use Insert image. Images are embedded in the email body.</p>
    </div>
  );
}
