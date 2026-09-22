// supabase/functions/send-confirmation/index.ts
//
// Called by the website right after someone submits the Register form.
// Sends them a "you're in" confirmation email from your Gmail address.
//
// Secrets required (set once with `supabase secrets set`):
//   GMAIL_USER            e.g. shift.aiesecbardo@gmail.com
//   GMAIL_APP_PASSWORD    a 16-character Gmail "App Password" (not your normal password)

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVENT_NAME = "SHIFT — Where Business Meets AI";
const EVENT_DATE = "November 28, 2026";
const EVENT_ORGANIZER = "AIESEC in Bardo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { full_name, email, applicant_id } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Missing full_name or email" }), {
        status: 400,
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

    const firstName = full_name.split(" ")[0];

    await client.send({
      from: `${EVENT_NAME} <${gmailUser}>`,
      to: email,
      subject: `You're in — ${EVENT_NAME}`,
      content: "auto",
      html: `
        <div style="font-family: Arial, sans-serif; background:#0B0E14; color:#e1e2eb; padding:32px;">
          <div style="max-width:520px;margin:0 auto;background:#121721;border:1px solid #1F2837;border-radius:16px;padding:32px;">
            <p style="color:#D9FD53;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Registration Confirmed</p>
            <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">Hey ${firstName}, you're on the list 🎉</h1>
            <p style="color:#c5c9af;line-height:1.6;">
              Thanks for registering for <strong style="color:#fff;">${EVENT_NAME}</strong>,
              organized by ${EVENT_ORGANIZER}. Your seat is reserved for
              <strong style="color:#fff;">${EVENT_DATE}</strong>.
            </p>
            <p style="color:#c5c9af;line-height:1.6;">
              We'll send you a reminder with the final details (venue, agenda, and what to bring)
              closer to the day. Keep an eye on your inbox.
            </p>
            <p style="color:#9CA3AF;font-size:13px;margin-top:32px;">— The ${EVENT_ORGANIZER} Team</p>
          </div>
        </div>
      `,
    });

    await client.close();

    // Mark the applicant as confirmed (best-effort — doesn't fail the request if it errors)
    if (applicant_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        await admin
          .from("applicants")
          .update({ confirmation_sent: true, confirmation_sent_at: new Date().toISOString() })
          .eq("id", applicant_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
