import WhatsAppTemplates from "@/components/tools/WhatsAppTemplates";
import EOSCalculator from "@/components/tools/EOSCalculator";

export default function ToolsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Useful Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Resources to help you work smarter</p>
      </div>
      <div className="space-y-6">
        <EOSCalculator />
        <WhatsAppTemplates />
      </div>
    </div>
  );
}
