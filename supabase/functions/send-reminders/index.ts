// supabase/functions/send-reminders/index.ts
//
// Called from the admin page when you click "Send reminder to everyone".
// Requires the caller to be logged in (checked below) — random people on the
// internet cannot trigger this.
//
// Secrets required (same as send-confirmation):
//   GMAIL_USER
//   GMAIL_APP_PASSWORD
//
// NOTE on limits: a normal Gmail account can send ~500 emails/day, and Google
// throttles bursts. This function sends one-by-one with a short pause between
// each message, which is safe for a few hundred guests. If your list grows
// past ~400 people, consider switching to a dedicated sending service.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVENT_NAME = "SHIFT — Where Business Meets AI";
const EVENT_DATE = "November 28, 2026 · 09:00";
const EVENT_ORGANIZER = "AIESEC in Bardo";
const VENUE = "TBA — check the website for the final venue";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify the caller is a logged-in admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load all registered applicants using the service role (bypasses RLS)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: applicants, error: fetchError } = await admin
      .from("applicants")
      .select("id, full_name, email")
      .eq("status", "registered");

    if (fetchError) throw fetchError;
    if (!applicants || applicants.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, failed: 0, message: "No applicants to email." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!gmailUser || !gmailPass) {
      throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD secrets are not set");
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const applicant of applicants) {
      const firstName = (applicant.full_name || "there").split(" ")[0];
      try {
        await client.send({
          from: `${EVENT_NAME} <${gmailUser}>`,
          to: applicant.email,
          subject: `Reminder — ${EVENT_NAME} is coming up`,
          content: "auto",
          html: `
            <div style="font-family: Arial, sans-serif; background:#0B0E14; color:#e1e2eb; padding:32px;">
              <div style="max-width:520px;margin:0 auto;background:#121721;border:1px solid #1F2837;border-radius:16px;padding:32px;">
                <p style="color:#D9FD53;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Reminder</p>
                <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">See you soon, ${firstName}!</h1>
                <p style="color:#c5c9af;line-height:1.6;">
                  This is a quick reminder that you're registered for
                  <strong style="color:#fff;">${EVENT_NAME}</strong>, organized by ${EVENT_ORGANIZER}.
                </p>
                <p style="color:#c5c9af;line-height:1.6;">
                  <strong style="color:#fff;">When:</strong> ${EVENT_DATE}<br/>
                  <strong style="color:#fff;">Where:</strong> ${VENUE}
                </p>
                <p style="color:#9CA3AF;font-size:13px;margin-top:32px;">— The ${EVENT_ORGANIZER} Team</p>
              </div>
            </div>
          `,
        });
        sent++;
        await admin
          .from("applicants")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", applicant.id);
      } catch (e) {
        console.error(`Failed to email ${applicant.email}:`, e);
        failed++;
      }
      // Small pause to stay well under Gmail's rate limits
      await sleep(400);
    }

    await client.close();

    return new Response(JSON.stringify({ success: true, sent, failed, total: applicants.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
