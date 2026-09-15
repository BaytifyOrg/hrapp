import { NextResponse } from "next/server";
import { sendOnboardingNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, phone } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }
    await sendOnboardingNotification({ name, email, phone });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding notification error:", err);
    // Don't block the form submission if email fails
    return NextResponse.json({ success: false });
  }
}
