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
  "enquiry_date",
  "source",
  "status",
  "followup_date",
  "followup_remarks",
  "is_opportunity",
];

export function downloadLeadCsvTemplate() {
  const content = `\uFEFF${CSV_TEMPLATE_HEADERS.join(",")}\r\n`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lead-import-template.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
