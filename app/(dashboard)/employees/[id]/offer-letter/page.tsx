import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OfferLetterGenerator from "@/components/employees/OfferLetterGenerator";

export default async function OfferLetterPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/employees/${id}`} className="btn-secondary">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Offer Letter</h1>
          <p className="text-sm text-gray-500">{emp.first_name} {emp.last_name}</p>
        </div>
      </div>

      <OfferLetterGenerator employee={emp} salary={salary} />
    </div>
  );
}
