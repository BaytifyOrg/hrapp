import { format, parseISO, differenceInCalendarDays, eachDayOfInterval, isWeekend } from "date-fns";

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  try { return format(parseISO(date), "dd MMM yyyy"); } catch { return "—"; }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function countWorkingDays(startDate: string, endDate: string): number {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return days.filter((d) => !isWeekend(d)).length;
}

export function getMonthName(month: number): string {
  return format(new Date(2024, month - 1, 1), "MMMM");
}

// Payroll cycle: 25th of previous month → 24th of current month
// e.g. "May 2026" payroll = April 25 – May 24 2026
export function getPayrollPeriod(month: number, year: number): { start: Date; end: Date; label: string } {
  const end = new Date(year, month - 1, 24);
  const start = new Date(year, month - 2, 25);
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return { start, end, label: `${startLabel} – ${endLabel}` };
}

// Given a deal date, return the payroll period it belongs to
export function getDealPayrollPeriod(dealDate: Date): { start: Date; end: Date } {
  const day = dealDate.getDate();
  if (day >= 25) {
    // On or after the 25th → belongs to NEXT month's payroll cycle
    return {
      start: new Date(dealDate.getFullYear(), dealDate.getMonth(), 25),
      end: new Date(dealDate.getFullYear(), dealDate.getMonth() + 1, 24),
    };
  } else {
    // Before the 25th → belongs to THIS month's payroll cycle
    return {
      start: new Date(dealDate.getFullYear(), dealDate.getMonth() - 1, 25),
      end: new Date(dealDate.getFullYear(), dealDate.getMonth(), 24),
    };
  }
}

// Baytify commission slab structure 2026
// Based on total commission EARNED per month (not deal value)
export const COMMISSION_SLABS = [
  { min: 500000, rate: 75 },
  { min: 350000, rate: 70 },
  { min: 175000, rate: 65 },
  { min: 100000, rate: 60 },
  { min: 0,      rate: 55 },
];

export function getSlabRate(monthlyCommission: number): number {
  for (const slab of COMMISSION_SLABS) {
    if (monthlyCommission >= slab.min) return slab.rate;
  }
  return 55;
}

export const LEAD_SOURCES = [
  { value: "direct",          label: "Direct" },
  { value: "property_finder", label: "Property Finder (50%)" },
  { value: "bayut",           label: "Bayut (50%)" },
];

export const DEPARTMENTS = [
  "Sales", "Leasing", "Property Management", "Finance",
  "HR & Admin", "Marketing", "Legal", "Operations", "Management",
];

export const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan",
  "Antiguan", "Argentine", "Armenian", "Australian", "Austrian", "Azerbaijani",
  "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian",
  "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Botswanan",
  "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burundian",
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African",
  "Chadian", "Chilean", "Chinese", "Colombian", "Comorian", "Congolese",
  "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech",
  "Danish", "Djiboutian", "Dominican", "Dutch",
  "Ecuadorian", "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean",
  "Estonian", "Ethiopian", "Eswatini",
  "Fijian", "Filipino", "Finnish", "French",
  "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek",
  "Grenadian", "Guatemalan", "Guinea-Bissauan", "Guinean", "Guyanese",
  "Haitian", "Honduran", "Hungarian",
  "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish",
  "Israeli", "Italian", "Ivorian",
  "Jamaican", "Japanese", "Jordanian",
  "Kazakhstani", "Kenyan", "Kuwaiti", "Kyrgyzstani",
  "Laotian", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner",
  "Lithuanian", "Luxembourgish",
  "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese",
  "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan",
  "Mongolian", "Montenegrin", "Moroccan", "Mozambican", "Myanmar",
  "Namibian", "Nepali", "New Zealander", "Nicaraguan", "Nigerian",
  "North Korean", "North Macedonian", "Norwegian",
  "Omani",
  "Pakistani", "Palauan", "Panamanian", "Papua New Guinean", "Paraguayan",
  "Peruvian", "Polish", "Portuguese",
  "Qatari",
  "Romanian", "Russian", "Rwandan",
  "Salvadoran", "Samoan", "Saudi Arabian", "Senegalese", "Serbian",
  "Sierra Leonean", "Singaporean", "Slovak", "Slovenian", "Somali",
  "South African", "South Korean", "South Sudanese", "Spanish", "Sri Lankan",
  "Sudanese", "Surinamese", "Swedish", "Swiss", "Syrian",
  "Taiwanese", "Tajikistani", "Tanzanian", "Thai", "Timorese", "Togolese",
  "Trinidadian", "Tunisian", "Turkish", "Turkmenistani",
  "Ugandan", "Ukrainian", "Uruguayan", "Uzbekistani",
  "Venezuelan", "Vietnamese",
  "Yemeni",
  "Zambian", "Zimbabwean",
  "Other",
];
