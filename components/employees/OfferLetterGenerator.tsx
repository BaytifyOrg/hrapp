"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SignaturePad from "signature_pad";
import { FileText, PenLine, CheckCircle, RotateCcw } from "lucide-react";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department: string | null;
  emirates_id: string | null;
  start_date: string | null;
  email: string;
};

type Salary = {
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
} | null;

type OfferType = "team_leader" | "broker" | "general";

const OFFER_TYPES = [
  { value: "team_leader", label: "Team Leader" },
  { value: "broker", label: "Broker" },
  { value: "general", label: "General / Other Role" },
];

export default function OfferLetterGenerator({
  employee,
  salary,
}: {
  employee: Employee;
  salary: Salary;
}) {
  const supabase = createClient();
  const [step, setStep] = useState<"config" | "preview" | "sign_employer" | "sign_employee" | "done">("config");
  const [offerType, setOfferType] = useState<OfferType>("general");

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");

  // Editable fields
  const [fields, setFields] = useState({
    date: today,
    basicSalary: salary ? String(salary.basic_salary) : "",
    housingAllowance: salary ? String(salary.housing_allowance) : "",
    transportAllowance: salary ? String(salary.transport_allowance) : "",
    otherAllowances: salary ? String(salary.other_allowances) : "",
    commissionRate: "50",
    bonus100: "5000",
    bonus110: "7000",
    bonus130: "10000",
    bonus150: "15000",
    overrideRate: "5",
    overrideCap: "10000",
    minTeamSize: "5",
    brokerTarget: "2",
    customRole: employee.job_title ?? "",
    additionalTerms: "",
  });

  const [employerSig, setEmployerSig] = useState<string>("");
  const [employeeSig, setEmployeeSig] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const employerPadRef = useRef<HTMLCanvasElement>(null);
  const employeePadRef = useRef<HTMLCanvasElement>(null);
  const employerSigPad = useRef<SignaturePad | null>(null);
  const employeeSigPad = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (step === "sign_employer" && employerPadRef.current) {
      employerSigPad.current = new SignaturePad(employerPadRef.current, { backgroundColor: "rgb(255,255,255)" });
    }
    if (step === "sign_employee" && employeePadRef.current) {
      employeeSigPad.current = new SignaturePad(employeePadRef.current, { backgroundColor: "rgb(255,255,255)" });
    }
  }, [step]);

  function updateField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function gross() {
    return (
      (parseFloat(fields.basicSalary) || 0) +
      (parseFloat(fields.housingAllowance) || 0) +
      (parseFloat(fields.transportAllowance) || 0) +
      (parseFloat(fields.otherAllowances) || 0)
    );
  }

  function saveEmployerSig() {
    if (!employerSigPad.current || employerSigPad.current.isEmpty()) {
      alert("Please sign before continuing.");
      return;
    }
    setEmployerSig(employerSigPad.current.toDataURL("image/png"));
    setStep("sign_employee");
  }

  function saveEmployeeSig() {
    if (!employeeSigPad.current || employeeSigPad.current.isEmpty()) {
      alert("Please sign before continuing.");
      return;
    }
    setEmployeeSig(employeeSigPad.current.toDataURL("image/png"));
    generateAndSavePDF(employeeSigPad.current.toDataURL("image/png"));
  }

  async function generateAndSavePDF(empSig: string) {
    setSaving(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = 210;
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = 20;

      const addPage = () => {
        doc.addPage();
        y = 20;
        addFooter();
      };

      const checkY = (needed: number) => {
        if (y + needed > 270) addPage();
      };

      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("baytify.com", margin, 285);
        doc.text("hello@baytify.com  •  +971 4 433 4723", margin, 289);
        doc.text("Office 115, Building A3, Dubai South Headquarters, Dubai, United Arab Emirates", margin, 293);
        doc.setTextColor(0);
      };

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Baytify", margin, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("REAL ESTATE", margin + 40, y - 5);
      doc.text("DUBAI & GLOBAL", margin + 40, y);
      doc.setTextColor(0);
      y += 12;

      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 10;

      // Title
      const titleMap: Record<OfferType, string> = {
        team_leader: "TEAM LEADER OFFER",
        broker: "BROKER OFFER",
        general: "OFFER LETTER",
      };
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const title = titleMap[offerType];
      const titleW = doc.getTextWidth(title);
      doc.text(title, (pageW - titleW) / 2, y);
      y += 14;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const empName = `${employee.first_name} ${employee.last_name}`;
      const eidText = employee.emirates_id ? ` bearing EID No. ${employee.emirates_id}` : "";

      // Date
      doc.text(`Date: ${fields.date}`, margin, y);
      y += 8;

      // Intro
      const roleLabel =
        offerType === "team_leader" ? "Team Leader"
          : offerType === "broker" ? "Broker"
          : fields.customRole || employee.job_title || "Employee";

      const intro = `This Offer sets out the terms and conditions applicable to the position of ${roleLabel} ("${roleLabel}") ${empName}${eidText} at Baytify Real Estate LLC ("the Company").`;
      const introLines = doc.splitTextToSize(intro, contentW);
      checkY(introLines.length * 5 + 4);
      doc.text(introLines, margin, y);
      y += introLines.length * 5 + 6;

      const addSection = (num: string, heading: string, content: () => void) => {
        checkY(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${num}. ${heading}`, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        content();
        y += 4;
      };

      const addPara = (text: string) => {
        const lines = doc.splitTextToSize(text, contentW);
        checkY(lines.length * 5 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 2;
      };

      const addBullet = (text: string) => {
        const lines = doc.splitTextToSize(`• ${text}`, contentW - 4);
        checkY(lines.length * 5);
        doc.text(lines, margin + 4, y);
        y += lines.length * 5;
      };

      if (offerType === "team_leader") {
        addSection("1", "Role & Scope", () => {
          addPara("The Team Leader is responsible for:");
          addBullet("Building, managing, and scaling a team of brokers;");
          addBullet("Ensuring brokers are properly onboarded, trained, and operational;");
          addBullet("Driving team performance against Company targets;");
          addBullet("Maintaining transparency and accurate reporting through Company systems.");
          y += 2;
          addPara("The Team Leader role is primarily a leadership and management position, not an individual brokerage role.");
        });

        addSection("2", "Performance Cycle (Cycle-Based Reporting)", () => {
          addPara("All performance, targets, bonuses, and commissions are calculated on a cycle-based reporting period, not on a calendar month.");
          addPara("Each Performance Cycle runs from the 25th of the month to the 24th of the following month.");
          addPara("Salary and bonuses are paid on the 25th, based on the closed cycle.");
          addPara("For each cycle:");
          addBullet("A separate reporting file is created;");
          addBullet("The file represents the official performance record for that cycle;");
          addBullet("Once the cycle is closed, the file becomes read-only and cannot be edited.");
          y += 2;
          addPara("Historical cycle data is final and binding.");
        });

        addSection("3", "Team Structure & Targets", () => {
          doc.setFont("helvetica", "bold");
          doc.text("3.1 Minimum Team Size", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addPara(`To qualify for and maintain the Team Leader role, the Team Leader must manage a minimum of ${fields.minTeamSize} brokers.`);

          doc.setFont("helvetica", "bold");
          doc.text("3.2 Team Target Calculation", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addBullet(`A standard per-broker target applies per cycle, which is AED ${fields.brokerTarget}M sales per broker.`);
          addBullet("Team Target = number of active brokers × per-broker target.");
          y += 2;
          addPara("If team size increases during a cycle:");
          addBullet("The target is adjusted proportionally;");
          addBullet("No retroactive penalties apply.");
          y += 2;
          addPara("This structure is designed to encourage team growth and scalability.");
        });

        addSection("4", "Active Broker Definition & Onboarding", () => {
          addPara("A broker is considered Active after completing 30 days of onboarding.");
          addPara("However:");
          addBullet("Any deal closed by a broker during the first 30 days still counts toward the Team Target.");
          y += 2;
          addPara("The Team Leader is responsible for:");
          addBullet("Broker onboarding and readiness;");
          addBullet("Ensuring access to systems, tools, and documentation;");
          addBullet("Tracking onboarding progress and updates.");
        });

        addSection("5", "Definition of Secured Deals", () => {
          addPara("For the purpose of target achievement, bonuses, and performance evaluation, a Secured Deal is defined as:");
          addBullet("A signed SPA / SBA, and");
          addBullet("Confirmation from the developer that the commission is payable.");
          y += 2;
          addPara("Actual receipt of commission funds is not required for a deal to count toward targets or bonuses.");
        });

        addSection("6", "Company Leads Only", () => {
          doc.setFont("helvetica", "bold");
          doc.text("6.1 Eligible Deals", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addPara("Only Company Leads are eligible for:");
          addBullet("Team Target achievement;");
          addBullet("Team Leader bonuses;");
          addBullet("Performance evaluation;");
          addBullet("Override and commission-based incentives.");
          y += 2;
          addPara("A Company Lead is a lead that:");
          addBullet("Is generated, assigned, or approved through the Company's CRM;");
          addBullet("Originates from Company marketing channels, partnerships, events, or other Company-approved sources;");
          addBullet("Is properly registered and tracked in Company systems.");

          doc.setFont("helvetica", "bold");
          doc.text("6.2 Non-Company Leads", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addPara("Deals originating outside the Company's official lead flow do not count toward:");
          addBullet("Team Target;");
          addBullet("Bonuses;");
          addBullet("Overrides;");
          addBullet("Performance metrics.");
        });

        addSection("7", "Team Leader Personal Deals", () => {
          addPara("If the Team Leader personally closes a deal:");
          addBullet("The deal is counted only if it originates from a Company Lead;");
          addBullet("The deal must be registered and approved in the CRM.");
          y += 2;
          addPara("If these conditions are met:");
          addBullet("The deal counts toward Team Target;");
          addBullet("The deal counts toward bonus achievement;");
          addBullet("The Team Leader does not receive override on their own deal.");
          y += 2;
          addPara("Deals not originating from Company Leads are excluded entirely from all Team Leader KPIs and calculations.");
        });

        addSection("8", "Compensation Structure", () => {
          doc.setFont("helvetica", "bold");
          doc.text("8.1 Fixed Salary", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          if (fields.basicSalary) addBullet(`Base salary: AED ${parseFloat(fields.basicSalary).toLocaleString()} per Performance Cycle`);
          if (fields.housingAllowance && parseFloat(fields.housingAllowance) > 0) addBullet(`Housing allowance: AED ${parseFloat(fields.housingAllowance).toLocaleString()}`);
          if (fields.transportAllowance && parseFloat(fields.transportAllowance) > 0) addBullet(`Transport allowance: AED ${parseFloat(fields.transportAllowance).toLocaleString()}`);
          if (gross() > 0) { y += 2; addPara(`Total monthly compensation: AED ${gross().toLocaleString()}`); }

          y += 2;
          doc.setFont("helvetica", "bold");
          doc.text("8.2 Performance Bonus (Non-Cumulative)", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addPara("Performance bonuses are awarded based on the highest level of Team Target achievement reached within a Performance Cycle. Bonuses are non-cumulative.");
          addBullet(`100% of Team Target achieved → AED ${parseFloat(fields.bonus100).toLocaleString()}`);
          addBullet(`110% achieved → AED ${parseFloat(fields.bonus110).toLocaleString()}`);
          addBullet(`130% achieved → AED ${parseFloat(fields.bonus130).toLocaleString()}`);
          addBullet(`150% achieved → AED ${parseFloat(fields.bonus150).toLocaleString()}`);
          y += 2;
          addPara("Only the highest applicable bonus is paid per cycle. Bonuses do not stack.");
        });

        addSection("9", "Override Commission", () => {
          addPara(`The Team Leader is entitled to an override commission of ${fields.overrideRate}% on Company commission generated by brokers within their team.`);
          doc.setFont("helvetica", "bold");
          doc.text("9.1 Payment Timing", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addPara("Override commission is payable only after the Company receives the commission funds.");

          doc.setFont("helvetica", "bold");
          doc.text("9.2 Override Cap (Per Broker)", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addBullet(`Maximum override per broker per Performance Cycle: AED ${parseFloat(fields.overrideCap).toLocaleString()}`);
          addBullet("There is no total override cap across the team.");
          addBullet("The cap applies individually to each broker.");
        });

        addSection("10", "Weekly Reporting Obligations", () => {
          addPara("The Team Leader must maintain accurate and timely weekly reporting, including:");
          addBullet("Leads received and contacted (within 24 hours);");
          addBullet("Viewings, offers, and secured deals;");
          addBullet("Broker activity and onboarding status.");
          y += 2;
          addPara("Failure to maintain reporting standards may affect bonus eligibility, performance evaluation, and continuation of the Team Leader role.");
        });
      } else if (offerType === "broker") {
        addSection("1", "Role & Scope", () => {
          addPara("The Broker is responsible for:");
          addBullet("Generating and converting leads into secured deals;");
          addBullet("Maintaining accurate and timely CRM records;");
          addBullet("Representing Baytify Real Estate LLC professionally at all times;");
          addBullet("Meeting individual performance targets as set by the Company.");
        });

        addSection("2", "Compensation Structure", () => {
          addPara("This is a commission-only role. No fixed base salary applies.");
          y += 2;
          doc.setFont("helvetica", "bold");
          doc.text("2.1 Commission Rate", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          if (fields.commissionRate) {
            addPara(`The Broker is entitled to ${fields.commissionRate}% of Company-received commission on all secured deals originating from Company Leads.`);
          } else {
            addPara("Commission rate to be agreed separately in writing.");
          }
          y += 2;
          doc.setFont("helvetica", "bold");
          doc.text("2.2 Payment Timing", margin, y); y += 5;
          doc.setFont("helvetica", "normal");
          addPara("Commission is payable only after the Company receives the commission funds from the developer or client.");
        });

        addSection("3", "Definition of Secured Deals", () => {
          addPara("A Secured Deal is defined as:");
          addBullet("A signed SPA / SBA, and");
          addBullet("Confirmation from the developer that the commission is payable.");
          y += 2;
          addPara("Actual receipt of commission funds is not required for a deal to count toward targets.");
        });

        addSection("4", "Company Leads Only", () => {
          addPara("Only deals originating from Company Leads are eligible for commission and performance evaluation.");
          addPara("A Company Lead is one that is generated, assigned, or approved through the Company's CRM and official channels.");
          addPara("Deals from personal or external leads do not count toward Company KPIs and are not eligible for commission through the Company.");
        });

        addSection("5", "Performance Cycle", () => {
          addPara("Performance and commissions are tracked on a cycle-based reporting period running from the 25th of each month to the 24th of the following month.");
          addPara("Commission payments are made on the 25th of the month following receipt of funds.");
        });
      } else {
        addSection("1", "Role & Scope", () => {
          addPara(`The ${roleLabel} is responsible for fulfilling the duties and responsibilities as outlined by Baytify Real Estate LLC ("the Company") and as communicated by management from time to time.`);
        });

        if (fields.basicSalary || fields.housingAllowance || fields.transportAllowance) {
          addSection("2", "Compensation", () => {
            if (fields.basicSalary) addBullet(`Basic salary: AED ${parseFloat(fields.basicSalary).toLocaleString()} per month`);
            if (fields.housingAllowance && parseFloat(fields.housingAllowance) > 0) addBullet(`Housing allowance: AED ${parseFloat(fields.housingAllowance).toLocaleString()} per month`);
            if (fields.transportAllowance && parseFloat(fields.transportAllowance) > 0) addBullet(`Transport allowance: AED ${parseFloat(fields.transportAllowance).toLocaleString()} per month`);
            if (fields.otherAllowances && parseFloat(fields.otherAllowances) > 0) addBullet(`Other allowances: AED ${parseFloat(fields.otherAllowances).toLocaleString()} per month`);
            if (gross() > 0) { y += 2; addPara(`Total monthly compensation: AED ${gross().toLocaleString()}`); }
          });
        }

        if (fields.additionalTerms) {
          addSection("3", "Additional Terms", () => {
            addPara(fields.additionalTerms);
          });
        }
      }

      // Shared clauses
      const nextSectionNum = offerType === "team_leader" ? "11" : offerType === "broker" ? "6" : fields.additionalTerms ? "4" : "3";

      addSection(nextSectionNum, "Data Accuracy & Authority", () => {
        addPara("All calculations are based on official cycle reports, CRM records, and finance and developer confirmations. In case of discrepancies, Company records prevail.");
      });

      addSection(String(parseInt(nextSectionNum) + 1), "Confidentiality & Non-Disclosure", () => {
        addPara("All information relating to the Company is strictly confidential. The employee shall not disclose any Confidential Information to any third party during or after their engagement with the Company, without prior written consent. This obligation applies indefinitely, including after termination.");
      });

      addSection(String(parseInt(nextSectionNum) + 2), "Non-Solicitation", () => {
        addPara("During the engagement and for 12 months after termination, the employee shall not directly or indirectly solicit, recruit, or attempt to recruit any Company broker, employee, or contractor, or divert Company clients, leads, or business opportunities.");
      });

      addSection(String(parseInt(nextSectionNum) + 3), "Non-Circumvention", () => {
        addPara("The employee shall not bypass the Company in dealings with its clients, brokers, partners, developers, or service providers, or use Company relationships or data to compete with or undermine the Company. This obligation survives termination.");
      });

      addSection(String(parseInt(nextSectionNum) + 4), "Right to Amend Terms", () => {
        addPara("The Company reserves the right to review, amend, or update the terms of this Offer, including compensation, targets, performance metrics, and operational policies, with prior written notice.");
      });

      addSection(String(parseInt(nextSectionNum) + 5), "Acceptance", () => {
        addPara("By accepting this Offer, the employee confirms that they have read and understood all terms, agree to all obligations, and accept that this Offer governs their engagement with the Company.");
      });

      // Signatures
      checkY(70);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Employee Signature:", margin, y);
      doc.text("Employer Signature:", margin + 100, y);
      y += 4;

      if (empSig) {
        doc.addImage(empSig, "PNG", margin, y, 60, 20);
      }
      if (employerSig) {
        doc.addImage(employerSig, "PNG", margin + 100, y, 60, 20);
      }
      y += 26;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${employee.first_name} ${employee.last_name}`, margin, y);
      doc.text("Sofiia Metawea", margin + 100, y);
      y += 5;
      doc.text(`Date: ${fields.date}`, margin, y);
      doc.text(`Date: ${fields.date}`, margin + 100, y);

      addFooter();

      const pdfBlob = doc.output("blob");
      const filename = `offer-letter-${employee.first_name.toLowerCase()}-${employee.last_name.toLowerCase()}-${fields.date.replace(/\./g, "-")}.pdf`;

      const path = `${employee.id}/${Date.now()}-${filename}`;
      const { error: storageError } = await supabase.storage
        .from("employee-docs")
        .upload(path, pdfBlob, { contentType: "application/pdf" });

      if (storageError) throw storageError;

      await supabase.from("employee_documents").insert({
        employee_id: employee.id,
        name: filename,
        file_path: path,
        category: "offer_letter",
        size_bytes: pdfBlob.size,
      });

      setStep("done");
      setSavedMessage(filename);
    } catch (err) {
      console.error(err);
      alert("Something went wrong generating the PDF. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Config step ──────────────────────────────────────────────────────────
  if (step === "config") {
    return (
      <div className="space-y-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={16} /> Offer Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">Offer Type</label>
              <select className="input" value={offerType} onChange={(e) => setOfferType(e.target.value as OfferType)}>
                {OFFER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date</label>
              <input className="input" value={fields.date} onChange={(e) => updateField("date", e.target.value)} />
            </div>

            {offerType === "general" && (
              <div>
                <label className="label">Role / Job Title</label>
                <input className="input" value={fields.customRole} onChange={(e) => updateField("customRole", e.target.value)} placeholder="e.g. Marketing Manager" />
              </div>
            )}

            {offerType !== "broker" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Basic Salary (AED)</label>
                  <input className="input" type="number" value={fields.basicSalary} onChange={(e) => updateField("basicSalary", e.target.value)} placeholder="e.g. 7000" />
                </div>
                <div>
                  <label className="label">Housing Allowance (AED)</label>
                  <input className="input" type="number" value={fields.housingAllowance} onChange={(e) => updateField("housingAllowance", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="label">Transport Allowance (AED)</label>
                  <input className="input" type="number" value={fields.transportAllowance} onChange={(e) => updateField("transportAllowance", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="label">Other Allowances (AED)</label>
                  <input className="input" type="number" value={fields.otherAllowances} onChange={(e) => updateField("otherAllowances", e.target.value)} placeholder="0" />
                </div>
              </div>
            )}

            {offerType === "broker" && (
              <div>
                <label className="label">Commission Rate (%)</label>
                <input className="input" type="number" value={fields.commissionRate} onChange={(e) => updateField("commissionRate", e.target.value)} placeholder="Leave blank to leave unspecified" />
                <p className="text-xs text-gray-400 mt-1">Leave blank to keep the commission rate unspecified in the letter.</p>
              </div>
            )}

            {offerType === "team_leader" && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Performance Bonus Tiers (AED)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Bonus at 100% target</label>
                      <input className="input" type="number" value={fields.bonus100} onChange={(e) => updateField("bonus100", e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Bonus at 110% target</label>
                      <input className="input" type="number" value={fields.bonus110} onChange={(e) => updateField("bonus110", e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Bonus at 130% target</label>
                      <input className="input" type="number" value={fields.bonus130} onChange={(e) => updateField("bonus130", e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Bonus at 150% target</label>
                      <input className="input" type="number" value={fields.bonus150} onChange={(e) => updateField("bonus150", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Override Commission (%)</label>
                    <input className="input" type="number" value={fields.overrideRate} onChange={(e) => updateField("overrideRate", e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Override Cap per Broker (AED)</label>
                    <input className="input" type="number" value={fields.overrideCap} onChange={(e) => updateField("overrideCap", e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Min Team Size</label>
                    <input className="input" type="number" value={fields.minTeamSize} onChange={(e) => updateField("minTeamSize", e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Per-Broker Target (AED M)</label>
                    <input className="input" type="number" value={fields.brokerTarget} onChange={(e) => updateField("brokerTarget", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {offerType === "general" && (
              <div>
                <label className="label">Additional Terms (optional)</label>
                <textarea className="input" rows={4} value={fields.additionalTerms} onChange={(e) => updateField("additionalTerms", e.target.value)} placeholder="Any additional role-specific terms..." />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => setStep("sign_employer")}>
            Continue to Signatures →
          </button>
        </div>
      </div>
    );
  }

  // ── Employer signature ───────────────────────────────────────────────────
  if (step === "sign_employer") {
    return (
      <div className="card max-w-xl mx-auto text-center">
        <PenLine size={28} className="mx-auto text-gray-400 mb-3" />
        <h2 className="font-semibold text-gray-900 text-lg mb-1">Employer Signature</h2>
        <p className="text-sm text-gray-500 mb-5">Sofiia Metawea — please sign below</p>
        <canvas
          ref={employerPadRef}
          width={500}
          height={150}
          className="border-2 border-dashed border-gray-200 rounded-xl w-full touch-none"
        />
        <div className="flex gap-3 justify-center mt-4">
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() => employerSigPad.current?.clear()}
          >
            <RotateCcw size={14} /> Clear
          </button>
          <button className="btn-primary" onClick={saveEmployerSig}>
            Confirm & Continue →
          </button>
        </div>
        <button className="text-xs text-gray-400 mt-3 underline" onClick={() => setStep("config")}>
          ← Back to edit
        </button>
      </div>
    );
  }

  // ── Employee signature ───────────────────────────────────────────────────
  if (step === "sign_employee") {
    return (
      <div className="card max-w-xl mx-auto text-center">
        <PenLine size={28} className="mx-auto text-gray-400 mb-3" />
        <h2 className="font-semibold text-gray-900 text-lg mb-1">Employee Signature</h2>
        <p className="text-sm text-gray-500 mb-5">{employee.first_name} {employee.last_name} — please sign below</p>
        <canvas
          ref={employeePadRef}
          width={500}
          height={150}
          className="border-2 border-dashed border-gray-200 rounded-xl w-full touch-none"
        />
        <div className="flex gap-3 justify-center mt-4">
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() => employeeSigPad.current?.clear()}
          >
            <RotateCcw size={14} /> Clear
          </button>
          <button className="btn-primary" onClick={saveEmployeeSig} disabled={saving}>
            {saving ? "Generating PDF…" : "Confirm & Generate PDF →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  return (
    <div className="card max-w-xl mx-auto text-center py-10">
      <CheckCircle size={40} className="mx-auto text-green-500 mb-4" />
      <h2 className="font-semibold text-gray-900 text-lg mb-1">Offer Letter Generated!</h2>
      <p className="text-sm text-gray-500 mb-4">
        The signed offer letter has been saved to {employee.first_name}&apos;s documents.
      </p>
      <p className="text-xs text-gray-400 mb-6 font-mono">{savedMessage}</p>
      <div className="flex gap-3 justify-center">
        <a href={`/employees/${employee.id}`} className="btn-secondary">
          View Employee Profile
        </a>
        <button className="btn-primary" onClick={() => { setStep("config"); setEmployerSig(""); setEmployeeSig(""); }}>
          Generate Another
        </button>
      </div>
    </div>
  );
}
