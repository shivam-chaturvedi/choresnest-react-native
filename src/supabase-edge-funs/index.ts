import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {

    const body = await req.json()
    const { user_id, email } = body

    if (!user_id && !email) {
      return new Response(
        JSON.stringify({
          error: "user_id or email is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    /*
      STEP 1
      Try direct deletion using user_id (fast path)
    */

    if (user_id) {

      const { error } = await supabase.auth.admin.deleteUser(user_id)

      if (!error) {
        return new Response(
          JSON.stringify({
            success: true,
            method: "user_id",
            message: "User deleted successfully"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        )
      }
    }

    /*
      STEP 2
      Fallback to email lookup
    */

    if (email) {

      const { data, error } = await supabase.auth.admin.listUsers()

      if (error) {
        return new Response(
          JSON.stringify({
            error: error.message
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        )
      }

      const user = data.users.find((u) => u.email === email)

      if (!user) {
        return new Response(
          JSON.stringify({
            error: "User not found"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        )
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteError) {
        return new Response(
          JSON.stringify({
            error: deleteError.message
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          method: "email_fallback",
          message: "User deleted successfully"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({
        error: "Deletion failed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: "Invalid request"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )

  }
})