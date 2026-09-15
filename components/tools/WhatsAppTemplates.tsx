"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";

type Template = {
  title: string;
  description: string;
  text: string;
};

type Category = {
  label: string;
  emoji: string;
  color: string;
  templates: Template[];
};

const CATEGORIES: Category[] = [
  {
    label: "Owner Outreach",
    emoji: "🏠",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    templates: [
      {
        title: "Cold Outreach — List Your Property",
        description: "First contact with a property owner",
        text: `Hi [Name]! 👋 My name is [Your Name] from Baytify Real Estate. I specialise in properties in [Area] and I currently have qualified buyers/tenants actively looking for a property just like yours.

Would you be open to a quick chat about the current market and what your property could achieve? No obligation at all — just a friendly conversation. 😊`,
      },
      {
        title: "Market Valuation Offer",
        description: "Offer a free valuation to an owner",
        text: `Hi [Name], it's [Your Name] from Baytify!

We've recently sold/leased several properties in [Area] and I'd love to share what the market is doing right now. I can offer you a FREE, no-obligation valuation so you know exactly where you stand.

Would you be available for a quick call this week? 📞`,
      },
      {
        title: "Follow-Up After No Response",
        description: "Second touch after no reply",
        text: `Hi [Name], I know you're busy so I'll keep this short! 😊

I reached out a little while ago about your property in [Area]. I still have active clients looking and I genuinely believe we could get you a great result.

Even if you're not ready to list right now, I'd love to keep in touch. Is now a good time for a quick 5-minute call? 🙏`,
      },
      {
        title: "Exclusive Mandate Pitch",
        description: "Pitch an exclusive listing agreement",
        text: `Hi [Name]! [Your Name] from Baytify here.

I wanted to reach out about your property in [Area]. Rather than having multiple agents, an exclusive listing with us means:

✅ Professional photography & videography
✅ Featured on all major portals
✅ Dedicated marketing budget
✅ One point of contact — no confusion

We've achieved [X]% above asking price for similar properties recently. Can I pop over to show you what we'd do for yours? 🏡`,
      },
    ],
  },
  {
    label: "Sales",
    emoji: "🔑",
    color: "bg-green-50 border-green-200 text-green-700",
    templates: [
      {
        title: "New Listing Alert",
        description: "Share a new property with a buyer",
        text: `Hi [Name]! Great news 🎉

I've just listed a stunning [X]-bed in [Community] that I think is perfect for you. Here's a quick summary:

🏠 [X] Bed | [X] Bath
📍 [Community], [Area]
💰 AED [Price]
✨ [Key feature e.g. Sea view / Corner unit / Vacant on transfer]

Shall I send over the full details and photos? I have viewings available [Day/Time]. 📸`,
      },
      {
        title: "Price Reduction Alert",
        description: "Notify a buyer of a price drop",
        text: `Hi [Name]! I have some exciting news for you 👇

The property we looked at in [Community] has just been REDUCED from AED [Old Price] to AED [New Price]. That's a saving of AED [Difference]!

The seller is motivated and wants a quick close. I think this won't last long at this price. Would you like to revisit it? 🏃`,
      },
      {
        title: "Post-Viewing Follow-Up",
        description: "Follow up after a property viewing",
        text: `Hi [Name]! It was great meeting you today at [Property/Community] 😊

I'd love to hear your thoughts — what did you like most, and is there anything that gave you pause?

I'm here to help you find the perfect fit so any feedback is really useful. And if you'd like to see anything else, just say the word! 🔑`,
      },
      {
        title: "End of Year / Motivated Seller",
        description: "Create urgency around a motivated seller",
        text: `Hi [Name]! I'm reaching out because I have a seller in [Community] who needs to close before [Date/End of Year].

This means they are genuinely open to offers — this is a rare opportunity to buy in [Area] below market value.

🏠 [X] Bed in [Community]
💰 Asking AED [Price] — negotiable
📋 [Key selling point]

Interested? Let me know and I'll arrange a private viewing ASAP. ⏰`,
      },
    ],
  },
  {
    label: "Leasing",
    emoji: "📋",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    templates: [
      {
        title: "New Rental Listing",
        description: "Share a new rental with a prospective tenant",
        text: `Hi [Name]! I hope you're well 😊

I have a great [X]-bedroom apartment available in [Community] that just came to market:

🏠 [X] Bed | [X] Bath
📍 [Community], [Area]
💰 AED [Annual Rent] per year
🗓️ Available from [Date]
✨ [Key feature e.g. Fully furnished / Chiller free / Private parking]

Would you like to arrange a viewing? I'm available [Days/Times]. 🏡`,
      },
      {
        title: "Viewing Confirmation",
        description: "Confirm a scheduled viewing with a tenant",
        text: `Hi [Name]! Just confirming your viewing for tomorrow 📅

📍 [Property Address / Community]
🕐 [Time]
🚗 Parking is available [at the building / on the street]

I'll meet you at the entrance. If anything changes please let me know as soon as possible. Looking forward to showing you around! 😊`,
      },
      {
        title: "Renewal Reminder to Tenant",
        description: "Remind a current tenant about lease renewal",
        text: `Hi [Name]! I hope you're enjoying [Property/Community] 😊

Your lease is coming up for renewal on [Date] and I wanted to reach out early to discuss your options.

Are you happy to renew? If so, I can get the paperwork started right away to make it hassle-free for you. If your circumstances have changed, I'm also happy to help you find something new.

Just let me know what works best for you! 🙏`,
      },
      {
        title: "Post-Viewing Follow-Up",
        description: "Check in after a tenant viewed a property",
        text: `Hi [Name]! It was lovely to meet you at [Property] today 😊

I wanted to check in — did the property feel like a good fit? I have a few similar options as well if you'd like to see more.

If you're keen to proceed, I can hold it for 24 hours while we get the paperwork sorted. Just say the word! 🗝️`,
      },
    ],
  },
  {
    label: "Off-Plan",
    emoji: "🏗️",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    templates: [
      {
        title: "New Project Launch",
        description: "Introduce a new off-plan development",
        text: `Hi [Name]! Exciting news — I have exclusive access to a brand new launch 🚀

🏗️ [Project Name] by [Developer]
📍 [Location]
💰 Starting from AED [Price]
📆 Handover: [Year/Quarter]
💳 Payment Plan: [X]% during construction | [X]% on handover

This is one of the best payment plans we've seen in [Area] and units are going fast. Want me to send over the full brochure and floor plans? 📐`,
      },
      {
        title: "Investment ROI Pitch",
        description: "Pitch off-plan as an investment opportunity",
        text: `Hi [Name]! I've been thinking about your investment goals and I think I've found something really exciting 📈

[Project Name] in [Area] offers:
✅ [X]% projected ROI
✅ Only [X]% down to reserve
✅ [Developer] — one of Dubai's most trusted
✅ Handover [Year] — capital appreciation already happening
✅ Option to resell during construction

Dubai's off-plan market is performing exceptionally well right now. Can I set up a quick call to walk you through the numbers? 📊`,
      },
      {
        title: "Follow-Up After Brochure Sent",
        description: "Check in after sharing project details",
        text: `Hi [Name]! I just wanted to follow up on the [Project Name] details I sent over 😊

Did you get a chance to have a look? I know there's a lot of information so I'm happy to jump on a quick call to walk you through it and answer any questions.

Also worth knowing — the launch price is only guaranteed until [Date], after which prices are expected to increase. I'd hate for you to miss out! 🏗️`,
      },
      {
        title: "Payment Plan Reminder",
        description: "Remind a client about an upcoming payment",
        text: `Hi [Name]! Just a friendly reminder that your next payment for [Project Name] is due on [Date] 📅

💰 Amount due: AED [Amount]
🏦 Payment to: [Developer / Account Details]
📋 Reference: [Reference Number]

Please don't hesitate to reach out if you have any questions or need any help with the process. Always here to help! 😊`,
      },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function WhatsAppTemplates() {
  const [activeCategory, setActiveCategory] = useState(0);
  const category = CATEGORIES[activeCategory];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-500 rounded-xl p-3 text-white flex-shrink-0">
          <MessageCircle size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">WhatsApp Templates</h2>
          <p className="text-sm text-gray-500">Click Copy, paste straight into WhatsApp and personalise the [brackets]</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeCategory === i
                ? cat.color
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div className="space-y-4">
        {category.templates.map((template) => (
          <div key={template.title} className="card">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="font-semibold text-gray-900">{template.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
              </div>
              <CopyButton text={template.text} />
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
              {template.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
