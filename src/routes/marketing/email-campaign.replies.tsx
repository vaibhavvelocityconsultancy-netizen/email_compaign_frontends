import { useMutation, useQuery } from "@tanstack/react-query";
import { ModuleHero } from "@/components/ModuleHero";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getInboundReplies, sendInboundReply } from "@/lib/api";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/marketing/email-campaign/replies")({
  head: () => ({
    meta: [
      { title: "Incoming Replies — Vantage CRM" },
      { name: "description", content: "View email campaign reply status and timestamps." },
    ],
  }),
  component: IncomingRepliesPage,
});

function IncomingRepliesPage() {
  const repliesQuery = useQuery({
    queryKey: ["inbound-replies"],
    queryFn: getInboundReplies,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const sendReplyMutation = useMutation({
    mutationFn: ({ id, subject, body }: { id: number; subject: string; body: string }) => sendInboundReply(id, subject, body),
    onSuccess: (result) => {
      toast.success(result.detail);
      setReplyBody("");
      void repliesQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message || "Could not send reply."),
  });
  const replies = repliesQuery.data ?? [];
  const pageCount = Math.max(1, Math.ceil(replies.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageReplies = replies.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selectedReply = replies.find((reply) => reply.id === selectedId) ?? pageReplies[0] ?? null;
  useEffect(() => {
    if (!selectedReply) return;
    const subject = selectedReply.subject || "Campaign email";
    setReplySubject(subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`);
    setReplyBody("");
  }, [selectedReply?.id]);
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-card/60 p-5 shadow-sm">
        <div>
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">COMMUNICATION</p>
          <ModuleHero eyebrow="Conversation inbox" title="Incoming Replies" description="Keep every prospect response visible so your team can respond with context." icon={<span aria-hidden="true">•</span>} />
        </div>
        <Button
          variant="outline"
          onClick={() => void repliesQuery.refetch()}
          disabled={repliesQuery.isFetching}
        >
          <RefreshCw className={`mr-2 size-4 ${repliesQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {repliesQuery.isLoading ? (
        <p className="rounded-lg border border-line p-6 text-sm text-muted-foreground">
          Loading incoming replies…
        </p>
      ) : repliesQuery.isError ? (
        <div className="rounded-lg border border-destructive/40 p-6">
          <p className="text-sm text-destructive">
            Could not load incoming replies. Please try again.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => void repliesQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : replies.length === 0 ? (
        <p className="rounded-lg border border-line p-8 text-center text-sm text-muted-foreground">
          No incoming replies yet.
        </p>
      ) : (
        <div className="grid min-h-[28rem] gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
          <div className="flex min-h-0 flex-col rounded-lg border border-line">
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {pageReplies.map((reply) => {
                const isSelected = selectedReply?.id === reply.id;
                return (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => setSelectedId(reply.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? "bg-muted/60" : ""
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="truncate text-sm font-medium">{reply.sender_email}</span>
                      <time className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {new Date(reply.received_at).toLocaleDateString()}
                      </time>
                    </span>
                    <span className="mt-1 block truncate text-sm">
                      {reply.status === "replied" ? "Replied" : reply.status}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {reply.lead?.name ?? "Unmatched sender"}
                      {reply.campaign ? ` · ${reply.campaign.name}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-line px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous page"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next page"
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {selectedReply && (
            <article className="min-w-0 rounded-lg border border-line p-5">
              <div className="border-b border-line pb-4">
                <h2 className="break-words text-xl font-semibold">
                  {selectedReply.status === "unmatched" ? "Unmatched message" : "Replied"}
                </h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[5rem_minmax(0,1fr)]">
                  <dt className="text-muted-foreground">From</dt>
                  <dd className="break-all">{selectedReply.sender_email}</dd>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd>{new Date(selectedReply.received_at).toLocaleString()}</dd>
                  <dt className="text-muted-foreground">Lead</dt>
                  <dd>
                    {selectedReply.lead
                      ? `${selectedReply.lead.name || selectedReply.lead.email} · ${selectedReply.lead.email ?? ""}`
                      : "Unmatched sender"}
                  </dd>
                  <dt className="text-muted-foreground">Campaign</dt>
                  <dd>{selectedReply.campaign?.name ?? "—"}</dd>
                </dl>
              </div>
              <div className="border-b border-line py-4">
                <h3 className="break-words font-medium">{selectedReply.subject || "(No subject)"}</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {selectedReply.body_plain || "No plain-text message body was available."}
                </p>
              </div>
              {selectedReply.lead ? <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendReplyMutation.mutate({ id: selectedReply.id, subject: replySubject, body: replyBody });
                }}
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="reply-subject">Subject</label>
                  <Input id="reply-subject" value={replySubject} onChange={(event) => setReplySubject(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="reply-body">Reply</label>
                  <Textarea
                    id="reply-body"
                    className="min-h-36"
                    placeholder={`Write a reply to ${selectedReply.sender_email}…`}
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={sendReplyMutation.isPending || !replyBody.trim()}>
                    <Send className="mr-2 size-4" />
                    {sendReplyMutation.isPending ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </form> : (
                <p className="mt-4 text-sm text-muted-foreground">
                  This message was saved for review but could not be confidently linked to a campaign lead.
                </p>
              )}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
