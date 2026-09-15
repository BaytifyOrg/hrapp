import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, Building2, Calendar, CreditCard, FileText } from "lucide-react";
import EmployeeLeaveHistory from "@/components/employees/EmployeeLeaveHistory";
import SalarySection from "@/components/employees/SalarySection";
import EmployeeDocuments from "@/components/employees/EmployeeDocuments";
import EmployeeSignatures from "@/components/employees/EmployeeSignatures";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: emp } = await supabase
    .from("employees")
    .select("*, salary_components(*)")
    .eq("id", id)
    .order("effective_from", { foreignTable: "salary_components", ascending: false })
    .single();

  if (!emp) notFound();

  const salary = emp.salary_components?.[0];
  const grossSalary = salary
    ? salary.basic_salary + salary.housing_allowance + salary.transport_allowance + salary.other_allowances
    : null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/employees" className="btn-secondary">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h1>
          <p className="text-sm text-gray-500">{emp.job_title ?? "No title"} · {emp.department ?? "No department"}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/employees/${id}/offer-letter`} className="btn-secondary flex items-center gap-1.5">
            <FileText size={15} /> Offer Letter
          </Link>
          <Link href={`/employees/${id}/edit`} className="btn-primary">Edit</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <section className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={16} /> Personal Details
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="Email" value={emp.email} icon={<Mail size={14} />} />
              <InfoRow label="Phone" value={emp.phone} icon={<Phone size={14} />} />
              <InfoRow label="Nationality" value={emp.nationality} />
              <InfoRow label="Emirates ID" value={emp.emirates_id} />
              <InfoRow label="Passport" value={emp.passport_number} />
              <InfoRow label="Visa No." value={emp.visa_number} />
              <InfoRow label="Visa Expiry" value={formatDate(emp.visa_expiry)} />
              <InfoRow label="Address" value={emp.address} />
            </dl>
          </section>

          {/* Employment */}
          <section className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 size={16} /> Employment
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="Department" value={emp.department} />
              <InfoRow label="Job Title" value={emp.job_title} />
              <InfoRow label="Start Date" value={formatDate(emp.start_date)} icon={<Calendar size={14} />} />
              <InfoRow label="End Date" value={formatDate(emp.end_date)} />
              <InfoRow label="Status" value={<span className="capitalize">{emp.status}</span>} />
            </dl>
          </section>

          {/* Bank */}
          <section className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={16} /> Bank Details (WPS)
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="Bank" value={emp.bank_name} />
              <InfoRow label="IBAN" value={emp.iban} />
              <InfoRow label="Routing Code" value={emp.bank_routing_code} />
            </dl>
          </section>

          <EmployeeLeaveHistory employeeId={id} />
          <EmployeeSignatures employeeId={id} />
          <EmployeeDocuments employeeId={id} />
        </div>

        {/* Right column — salary */}
        <div className="space-y-6">
          <SalarySection employeeId={id} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | React.ReactNode | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-gray-400 text-xs mb-0.5">{label}</dt>
      <dd className="text-gray-900 font-medium flex items-center gap-1">
        {icon}
        {value ?? "—"}
      </dd>
    </div>
  );
}
