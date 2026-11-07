const CSV_TEMPLATE_HEADERS = [
  "company_name",
  "company_address",
  "company_city",
  "company_state",
  "company_pincode",
  "company_country",
  "company_gst_number",
  "contact_name",
  "contact_designation",
  "contact_mobile",
  "contact_email",
  "category",
  "enquiry_date",
  "source",
  "status",
  "followup_date",
  "followup_remarks",
];

const CSV_TEMPLATE_ROWS = [
  [
    "Sample Company One",
    "123 Example Road",
    "Mumbai",
    "Maharashtra",
    "400001",
    "India",
    "",
    "Aarav Mehta",
    "Purchase Manager",
    "",
    "aarav.mehta@example.com",
    "Doctor",
    "2026-01-15",
    "WEBSITE",
    "NEW",
    "",
    "",
  ],
  [
    "Sample Company Two",
    "45 Demo Street",
    "Pune",
    "Maharashtra",
    "411001",
    "India",
    "",
    "Diya Sharma",
    "Operations Manager",
    "",
    "diya.sharma@example.com",
    "Operations",
    "2026-02-10",
    "OTHER",
    "NEW",
    "",
    "",
  ],
  [
    "Sample Company Three",
    "8 Test Industrial Estate",
    "Ahmedabad",
    "Gujarat",
    "380001",
    "India",
    "",
    "Kabir Patel",
    "Business Owner",
    "",
    "kabir.patel@example.com",
    "Doctor",
    "2026-03-05",
    "REFERENCE",
    "NEW",
    "",
    "",
  ],
];

export async function downloadLeadCsvTemplate(): Promise<void> {
  const rows = [CSV_TEMPLATE_HEADERS, ...CSV_TEMPLATE_ROWS];
  const content = `\uFEFF${rows.map((row) => row.join(",")).join("\r\n")}\r\n`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lead-import-template.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
