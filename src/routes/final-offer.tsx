import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Download, FileCheck2, FileText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuotations } from "@/lib/quotation-api";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const dateLabel = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const Route = createFileRoute("/final-offer")({
  head: () => ({
    meta: [
      { title: "Final Offer — Vantage CRM" },
      { name: "description", content: "Review and manage final offers generated from approved quotations." },
      { property: "og:title", content: "Final Offer — Vantage CRM" },
      { property: "og:description", content: "Review and manage final offers generated from approved quotations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinalOfferPage,
});

function FinalOfferPage() {
  const quotationsQuery = useQuery({
    queryKey: ["quotations"],
    queryFn: getQuotations,
  });

  const finalOffers = (quotationsQuery.data ?? []).filter(
    (quotation) => quotation.finalOfferGenerated || quotation.status === "APPROVED",
  );

  const totalValue = finalOffers.reduce((sum, quotation) => sum + quotation.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="rise">
        <div className="font-mono text-[11px] tracking-wide text-muted-foreground">ORDER FLOW</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Final Offer</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-line bg-surface/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Offers Ready</span>
              <FileCheck2 className="size-4 text-brand" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{finalOffers.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Current final offers in pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Offer Value</span>
              <Sparkles className="size-4 text-brand" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{money(totalValue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Combined final offer value</p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Actions</span>
              <FileText className="size-4 text-brand" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-2">
                <Link to="/sales/quotations">
                  <ArrowRight className="size-4" />
                  Create / Review
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rise overflow-hidden rounded-xl border border-line bg-surface/80" style={{ animationDelay: "90ms" }}>
        <div className="overflow-x-auto">
          {quotationsQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading final offers…</div>
          ) : finalOffers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                <FileText className="size-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">No final offers generated yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a quotation and generate the final offer from the sales workflow.
                </p>
              </div>
              <Button asChild className="gap-2">
                <Link to="/sales/quotations">
                  <ArrowRight className="size-4" />
                  Open quotations
                </Link>
              </Button>
            </div>
          ) : (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Quo. No.</th>
                  <th className="px-4 py-3 font-medium">FO Date</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Docs</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {finalOffers.map((offer) => (
                  <tr key={offer.id} className="border-t border-line align-middle">
                    <td className="px-4 py-3 font-medium">{offer.companyName || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{offer.quotationNumber || "—"}</td>
                    <td className="px-4 py-3">{dateLabel(offer.foDate ?? offer.quotationDate)}</td>
                    <td className="px-4 py-3">{offer.city || "—"}</td>
                    <td className="px-4 py-3 font-medium text-brand">{money(offer.totalAmount)}</td>
                    <td className="px-4 py-3">
                      {offer.finalOfferPdf ? (
                        <a
                          href={offer.finalOfferPdf}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                        >
                          <Download className="size-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/sales/quotations">View</Link>
                        </Button>
                        {!offer.finalOfferPdf && (
                          <Button asChild size="sm">
                            <Link to="/sales/quotations">Generate</Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
