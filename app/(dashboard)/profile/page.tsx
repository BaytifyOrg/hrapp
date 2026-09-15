import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();
  if (!profile?.employee_id) return <p className="text-gray-500">No employee profile linked to your account. Contact your HR admin.</p>;

  const { data: emp } = await supabase
    .from("employees")
    .select("*, salary_components(*)")
    .eq("id", profile.employee_id)
    .order("effective_from", { foreignTable: "salary_components", ascending: false })
    .single();

  if (!emp) redirect("/dashboard");

  const salary = emp.salary_components?.[0];
  const gross = salary ? salary.basic_salary + salary.housing_allowance + salary.transport_allowance + salary.other_allowances : null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="space-y-6">
        <section className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Personal Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Full Name" value={`${emp.first_name} ${emp.last_name}`} />
            <Info label="Email" value={emp.email} />
            <Info label="Phone" value={emp.phone} />
            <Info label="Nationality" value={emp.nationality} />
            <Info label="Emirates ID" value={emp.emirates_id} />
            <Info label="Passport" value={emp.passport_number} />
            <Info label="Visa No." value={emp.visa_number} />
            <Info label="Visa Expiry" value={formatDate(emp.visa_expiry)} />
          </dl>
        </section>

        <section className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Employment</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Job Title" value={emp.job_title} />
            <Info label="Department" value={emp.department} />
            <Info label="Start Date" value={formatDate(emp.start_date)} />
          </dl>
        </section>

        {salary && (
          <section className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Salary Package</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Basic Salary" value={formatCurrency(salary.basic_salary)} />
              <Info label="Housing Allowance" value={formatCurrency(salary.housing_allowance)} />
              <Info label="Transport Allowance" value={formatCurrency(salary.transport_allowance)} />
              {salary.other_allowances > 0 && <Info label="Other" value={formatCurrency(salary.other_allowances)} />}
              <Info label="Total / Month" value={<span className="font-bold text-green-600">{formatCurrency(gross!)}</span>} />
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode | null | undefined }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs mb-0.5">{label}</dt>
      <dd className="text-gray-900 font-medium">{value ?? "—"}</dd>
    </div>
  );
}
