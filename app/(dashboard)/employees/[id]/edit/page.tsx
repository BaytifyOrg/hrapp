import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EmployeeForm from "@/components/employees/EmployeeForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: emp } = await supabase.from("employees").select("*").eq("id", id).single();
  if (!emp) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/employees/${id}`} className="btn-secondary">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit — {emp.first_name} {emp.last_name}</h1>
      </div>
      <EmployeeForm employee={emp} />
    </div>
  );
}
