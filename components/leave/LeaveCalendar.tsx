"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type LeaveRequest = Record<string, unknown>;

const COLORS = [
  "#4f86c6", "#e07b54", "#5aaa7a", "#9b72cf", "#d4a843",
  "#e05480", "#54a8c7", "#7aaa5a", "#cf9672", "#6c8cbf",
];

// UAE Public Holidays — key: "YYYY-MM-DD", value: holiday name
// Islamic holidays are approximate and announced by the UAE government each year
const UAE_HOLIDAYS: Record<string, string> = {
  // 2025
  "2025-01-01": "New Year's Day",
  "2025-03-30": "Eid Al Fitr",
  "2025-03-31": "Eid Al Fitr",
  "2025-04-01": "Eid Al Fitr",
  "2025-06-05": "Arafat (Eid Al Adha Eve)",
  "2025-06-06": "Eid Al Adha",
  "2025-06-07": "Eid Al Adha",
  "2025-06-08": "Eid Al Adha",
  "2025-06-26": "Islamic New Year",
  "2025-09-04": "Prophet's Birthday",
  "2025-12-01": "Commemoration Day",
  "2025-12-02": "UAE National Day",
  "2025-12-03": "UAE National Day",
  // 2026
  "2026-01-01": "New Year's Day",
  "2026-03-19": "Eid Al Fitr",
  "2026-03-20": "Eid Al Fitr",
  "2026-03-21": "Eid Al Fitr",
  "2026-05-26": "Arafat (Eid Al Adha Eve)",
  "2026-05-27": "Eid Al Adha",
  "2026-05-28": "Eid Al Adha",
  "2026-05-29": "Eid Al Adha",
  "2026-06-16": "Islamic New Year",
  "2026-08-24": "Prophet's Birthday",
  "2026-12-01": "Commemoration Day",
  "2026-12-02": "UAE National Day",
  "2026-12-03": "UAE National Day",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

type Employee = { id: string; first_name: string; last_name: string; date_of_birth?: string | null };

export default function LeaveCalendar({ requests, employees = [] }: { requests: LeaveRequest[]; employees?: Employee[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const approved = requests.filter(r => r.status === "approved");

  const employeeColorMap = new Map<string, string>();
  let colorIdx = 0;
  approved.forEach(r => {
    const eid = r.employee_id as string;
    if (!employeeColorMap.has(eid)) {
      employeeColorMap.set(eid, COLORS[colorIdx % COLORS.length]);
      colorIdx++;
    }
  });

  const daysInMonth = getDaysInMonth(year, month);

  // Build birthday map: day → names
  const birthdayMap: Map<number, string[]> = new Map();
  employees.forEach(emp => {
    if (!emp.date_of_birth) return;
    const dob = new Date(emp.date_of_birth);
    if (dob.getMonth() === month) {
      const day = dob.getDate();
      if (!birthdayMap.has(day)) birthdayMap.set(day, []);
      birthdayMap.get(day)!.push(emp.first_name);
    }
  });

  const dayMap: Map<number, { name: string; color: string }[]> = new Map();

  approved.forEach(r => {
    const emp = r.employees as { first_name: string; last_name: string } | null;
    if (!emp) return;
    const color = employeeColorMap.get(r.employee_id as string) ?? "#999";
    const name = `${emp.first_name} ${emp.last_name}`;
    const start = new Date(r.start_date as string);
    const end = new Date(r.end_date as string);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date >= start && date <= end) {
        if (!dayMap.has(d)) dayMap.set(d, []);
        const existing = dayMap.get(d)!;
        if (!existing.find(e => e.name === name)) existing.push({ name, color });
      }
    }
  });

  const legendEntries: { name: string; color: string }[] = [];
  employeeColorMap.forEach((color, eid) => {
    const req = approved.find(r => r.employee_id === eid);
    const emp = req?.employees as { first_name: string; last_name: string } | null;
    if (emp) legendEntries.push({ name: `${emp.first_name} ${emp.last_name}`, color });
  });

  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  // Check how many public holidays fall in this month for the footer note
  const holidaysThisMonth = Array.from({ length: daysInMonth }, (_, i) => {
    const key = toDateKey(year, month, i + 1);
    return UAE_HOLIDAYS[key] ? { day: i + 1, name: UAE_HOLIDAYS[key] } : null;
  }).filter(Boolean) as { day: number; name: string }[];

  return (
    <div className="card mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Leave Calendar</h2>
          {holidaysThisMonth.length > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              {holidaysThisMonth.length} public holiday{holidaysThisMonth.length > 1 ? "s" : ""} this month
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <span className="font-medium text-gray-800 w-36 text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }).map((_, i) => {
          const day = i - firstDay + 1;
          const valid = day >= 1 && day <= daysInMonth;
          const entries = valid ? (dayMap.get(day) ?? []) : [];
          const isToday = isCurrentMonth && day === today;
          const holidayKey = valid ? toDateKey(year, month, day) : "";
          const holiday = holidayKey ? UAE_HOLIDAYS[holidayKey] : undefined;
          const birthdays = valid ? (birthdayMap.get(day) ?? []) : [];

          return (
            <div
              key={i}
              className={`rounded-lg p-1 min-h-[60px] ${valid ? (holiday ? "bg-amber-50" : "bg-gray-50") : ""}`}
              style={isToday ? { outline: "2px solid #C2B08B", outlineOffset: "1px" } : {}}
            >
              {valid && (
                <>
                  <p
                    className="text-xs font-medium mb-1 text-center w-5 h-5 flex items-center justify-center mx-auto rounded-full"
                    style={isToday ? { backgroundColor: "#C2B08B", color: "#fff" } : { color: holiday ? "#b45309" : "#6b7280" }}
                  >
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {holiday && (
                      <div
                        className="text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium"
                        style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                        title={holiday}
                      >
                        🇦🇪 {holiday}
                      </div>
                    )}
                    {birthdays.map((name, idx) => (
                      <div
                        key={`bday-${idx}`}
                        className="text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium"
                        style={{ backgroundColor: "#ec4899", color: "#fff" }}
                        title={`🎂 ${name}'s birthday`}
                      >
                        🎂 {name}
                      </div>
                    ))}
                    {entries.slice(0, holiday ? 2 : 3).map((e, idx) => (
                      <div
                        key={idx}
                        className="text-white text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium"
                        style={{ backgroundColor: e.color }}
                        title={e.name}
                      >
                        {e.name.split(" ")[0]}
                      </div>
                    ))}
                    {entries.length > (holiday ? 2 : 3) && (
                      <div className="text-[9px] text-gray-400 pl-1">+{entries.length - (holiday ? 2 : 3)} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-amber-400" />
          <span className="text-xs text-gray-600">UAE Public Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "#ec4899" }} />
          <span className="text-xs text-gray-600">Birthday</span>
        </div>
        {legendEntries.map(({ name, color }) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600">{name}</span>
          </div>
        ))}
        {legendEntries.length === 0 && (
          <span className="text-xs text-gray-400">No approved leave this month</span>
        )}
      </div>
    </div>
  );
}
