import { PayrollItem, PayrollRun } from "@/types";
import { format, parseISO } from "date-fns";

export interface WPSOptions {
  employerName: string;
  employerMOLId: string;
  agentBankCode: string;
  paymentDate: string;
}

export function generateWPSSIF(
  run: PayrollRun,
  items: PayrollItem[],
  opts: WPSOptions
): string {
  const { employerName, employerMOLId, agentBankCode, paymentDate } = opts;
  const fileDate = format(new Date(), "ddMMyyyy");
  const payDate = format(parseISO(paymentDate), "ddMMyyyy");
  const totalAmount = items.reduce((sum, i) => sum + i.net_pay, 0).toFixed(2);
  const count = items.length;

  const lines: string[] = [];

  // EDR – Employer Detail Record
  lines.push(
    [
      "EDR",
      "01",
      fileDate,
      payDate,
      employerName,
      employerMOLId,
      agentBankCode,
      count,
      totalAmount,
      "AED",
    ].join("|")
  );

  // EMP – one record per employee
  for (const item of items) {
    const emp = item.employees;
    const name = emp ? `${emp.first_name} ${emp.last_name}` : item.employee_id;
    const nationality = emp?.nationality ?? "Other";
    const iban = emp?.iban ?? "";
    const bankCode = emp?.bank_routing_code ?? agentBankCode;
    const basic = item.basic_salary.toFixed(2);
    const variable = (
      item.housing_allowance +
      item.transport_allowance +
      item.other_allowances -
      item.unpaid_deduction -
      item.other_deductions
    ).toFixed(2);
    const total = item.net_pay.toFixed(2);

    lines.push(
      [
        "EMP",
        item.employee_id,
        name,
        nationality,
        payDate,
        bankCode,
        iban,
        basic,
        variable,
        total,
        "AED",
      ].join("|")
    );
  }

  return lines.join("\n");
}

export function downloadSIF(content: string, month: number, year: number) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WPS_${String(month).padStart(2, "0")}_${year}.sif`;
  a.click();
  URL.revokeObjectURL(url);
}
