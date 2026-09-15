import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function EmployeeLeaveHistory({ employeeId }: { employeeId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leave_requests")
    .select("*, leave_types(name, color)")
    .eq("employee_id", employeeId)
    .order("start_date", { ascending: false })
    .limit(20);

  return (
    <section className="card">
      <h2 className="font-semibold text-gray-900 mb-4">Leave History</h2>
      {!data?.length ? (
        <p className="text-sm text-gray-400">No leave records.</p>
      ) : (
        <div className="space-y-2">
          {data.map((req) => {
            const lt = req.leave_types as { name: string; color: string } | null;
            const statusColor: Record<string, string> = {
              pending: "bg-amber-100 text-amber-700",
              approved: "bg-green-100 text-green-700",
              rejected: "bg-red-100 text-red-700",
            };
            return (
              <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                <div>
                  <p className="font-medium">{lt?.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(req.start_date)} → {formatDate(req.end_date)} · {req.days_count} days</p>
                </div>
                <span className={`badge ${statusColor[req.status] ?? "bg-gray-100 text-gray-600"}`}>{req.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
