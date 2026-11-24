// supabase/functions/strava-sync/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
    const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");

    const { data: settings } = await supabase
      .from("rider_settings")
      .select("strava_refresh_token")
      .eq("id", 1)
      .single();

    const refreshToken = settings?.strava_refresh_token || Deno.env.get("STRAVA_REFRESH_TOKEN");
    if (!refreshToken) throw new Error("Strava refresh token tidak ditemukan.");

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Gagal refresh Strava access token.");

    if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
      await supabase
        .from("rider_settings")
        .update({ strava_refresh_token: tokenData.refresh_token, strava_connected: true })
        .eq("id", 1);
    }

    const { data: defaultBike } = await supabase
      .from("bikes")
      .select("id")
      .eq("is_default", true)
      .single();

    if (!defaultBike) throw new Error("Tidak ada sepeda default aktif.");

    const actRes = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=15", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const activities = await actRes.json();

    let syncedCount = 0;
    for (const act of activities) {
      if (!["Ride", "GravelRide", "VirtualRide", "MountainBikeRide"].includes(act.type)) continue;
      const distanceKm = Number((act.distance / 1000).toFixed(2));
      if (distanceKm <= 0) continue;

      const rideType = act.type === "GravelRide" ? "Gravel" : act.type === "VirtualRide" ? "Trainer/Ind." : "Road";

      const { error } = await supabase.from("activities").upsert(
        {
          bike_id: defaultBike.id,
          strava_activity_id: act.id,
          title: act.name,
          ride_type: rideType,
          ride_date: act.start_date,
          distance_km: distanceKm,
          elevation_gain_m: act.total_elevation_gain || 0,
          elapsed_seconds: act.moving_time || 0,
          avg_speed_kmh: act.average_speed ? Number((act.average_speed * 3.6).toFixed(2)) : null,
          avg_power_w: act.average_watts ? Math.round(act.average_watts) : null,
          source: "strava",
          notes: `Synced from Strava (#${act.id})`,
        },
        { onConflict: "strava_activity_id", ignoreDuplicates: true }
      );

      if (!error) syncedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, syncedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
