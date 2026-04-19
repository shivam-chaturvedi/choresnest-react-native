import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const sendJson = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const logAndRespond = (payload: Record<string, unknown>, status = 200) => {
  console.error("invite-user response", payload);
  return sendJson(payload, status);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return sendJson({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const {
      action = "accept",
      inviteId,
      name,
      email,
      password,
      avatar,
      color,
    } = body;

    if (!inviteId) {
      return logAndRespond({ success: false, error: "Missing invite id" }, 400);
    }

    if (action === "accept" && (!name || !email || !password)) {
      return logAndRespond(
        { success: false, error: "Missing required invite data" },
        400,
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const inviteResult = await supabase
      .from("invites")
      .select("id, invitation_limit, expires_at, profile_id")
      .eq("id", inviteId)
      .single();

    if (inviteResult.error || !inviteResult.data) {
      return logAndRespond(
        {
          success: false,
          error: "Invite not found",
          details: inviteResult.error?.message,
        },
        404,
      );
    }

    const inviteRecord = inviteResult.data;
    const expiresAt = inviteRecord.expires_at
      ? new Date(inviteRecord.expires_at).getTime()
      : 0;
    const now = Date.now();

    if (expiresAt && expiresAt < now) {
      console.warn("invite-user: invite expired", inviteRecord.id);
      return sendJson(
        {
          valid: false,
          error: "expired",
          message: "Invite expired",
        },
        200,
      );
    }

    if (inviteRecord.invitation_limit !== null && inviteRecord.invitation_limit <= 0) {
      console.warn("invite-user: invite already used", inviteRecord.id);
      return sendJson(
        {
          valid: false,
          error: "already_used",
          message: "Invite already used",
        },
        200,
      );
    }

    if (action === "validate") {
      return sendJson({
        valid: true,
        profileId: inviteRecord.profile_id,
        expiresAt: inviteRecord.expires_at,
        invitationLimit: inviteRecord.invitation_limit,
      });
    }

    if (!inviteRecord.profile_id) {
      return logAndRespond({ success: false, error: "Invite missing profile" }, 500);
    }

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
      },
      email_confirm: true,
      email_disabled: false,
    });

    console.log(userData, userError);

    if (userError || !userData?.user) {
      const friendlyMessage =
        userError?.code === "email_exists"
          ? "An account with that email already exists. Use a different address."
          : userError?.message || "Failed to create user";

      return logAndRespond(
        {
          success: false,
          stage: "create_user",
          error: friendlyMessage,
          details: {
            code: userError?.code,
            status: userError?.status,
            hint: userError?.hint,
            message: userError?.message,
          },
        },
        userError?.status || 500,
      );
    }

    const isoNow = new Date().toISOString();
    const profilePayload = {
      id: userData.user.id,
      email,
      name,
      owner_id: inviteRecord.profile_id,
      symbol: avatar || "account",
      color: color || "member-blue",
      role: "member",
      is_active: true,
      is_guest: false,
      deleted: false,
      version: 1,
      created_at: isoNow,
      updated_at: isoNow,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        email,
        name,
        owner_id: inviteRecord.profile_id,
        symbol: avatar || "account",
        color: color || "member-blue",
        role: "member",
        is_active: true,
        is_guest: false,
        deleted: false,
        version: 1,
        updated_at: isoNow,
      })
      .eq("id", userData.user.id);

    if (profileError) {
      return logAndRespond(
        {
          success: false,
          stage: "create_profile",
          error: profileError.message,
          profilePayload,
          details: {
            code: profileError.code,
            hint: profileError.hint,
          },
        },
        500,
      );
    }

    const updatePayload: Record<string, unknown> = {
      invitation_limit: Math.max((inviteRecord.invitation_limit ?? 1) - 1, 0),
      expires_at: new Date().toISOString(),
    };

    const { error: inviteUpdateError } = await supabase
      .from("invites")
      .update(updatePayload)
      .eq("id", inviteId);

    if (inviteUpdateError) {
      return logAndRespond(
        {
          success: false,
          stage: "update_invite",
          error: inviteUpdateError.message,
        },
        500,
      );
    }

    return sendJson({
      success: true,
      profileId: userData.user.id,
      familyProfileId: inviteRecord.profile_id,
    });
  } catch (error) {
    console.error("invite-user function error", error);
    return logAndRespond(
      {
        success: false,
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
