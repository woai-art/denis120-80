import { createClient } from "@/lib/supabase/server";
import { rollingAverage } from "@/lib/calculations";
import type { DashboardSummary, Profile, UserDay } from "@/lib/types";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
}

export async function getOpenUserDay(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_days")
    .select("*")
    .eq("profile_id", profileId)
    .is("closed_at", null)
    .order("woke_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as UserDay | null;
}

export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const userDay = await getOpenUserDay(profile.id);

  const totals = {
    kcal: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    water_ml: 0,
  };

  if (userDay) {
    const { data: meals } = await supabase
      .from("meals")
      .select("id")
      .eq("user_day_id", userDay.id);

    const mealIds = meals?.map((meal) => meal.id) ?? [];

    if (mealIds.length > 0) {
      const { data: items } = await supabase
        .from("meal_items")
        .select("kcal, protein_g, fat_g, carbs_g")
        .in("meal_id", mealIds);

      for (const item of items ?? []) {
        totals.kcal += Number(item.kcal);
        totals.protein_g += Number(item.protein_g);
        totals.fat_g += Number(item.fat_g);
        totals.carbs_g += Number(item.carbs_g);
      }
    }

    const { data: waterLogs } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_day_id", userDay.id);

    totals.water_ml =
      waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0;
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const { data: weightLogs } = await supabase
    .from("weight_logs")
    .select("weight_kg, measured_at")
    .eq("profile_id", profile.id)
    .gte("measured_at", since.toISOString())
    .order("measured_at", { ascending: true });

  const weights = (weightLogs ?? []).map((log) => Number(log.weight_kg));
  const latestWeight = weights.at(-1) ?? null;
  const weightAvg7d = rollingAverage(weights.slice(-7));

  let insight: DashboardSummary["insight"] = null;
  if (userDay) {
    const { data: insightRow } = await supabase
      .from("ai_insights")
      .select("content_json")
      .eq("profile_id", profile.id)
      .eq("user_day_id", userDay.id)
      .eq("insight_type", "daily_tip")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insightRow?.content_json) {
      const content = insightRow.content_json as {
        tip?: string;
        action?: string;
        focus?: string;
      };
      insight = {
        tip: content.tip ?? "",
        action: content.action ?? "",
        focus: content.focus ?? "protein",
      };
    }
  }

  return {
    profile,
    userDay,
    totals,
    weightAvg7d,
    latestWeight,
    insight,
  };
}

export async function buildDayContext(profileId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return null;

  const userDay = await getOpenUserDay(profileId);

  const { data: recentUserDays } = await supabase
    .from("user_days")
    .select("id, woke_at, day_template_type")
    .eq("profile_id", profileId)
    .order("woke_at", { ascending: false })
    .limit(4);

  const recentDays: {
    date: string;
    kcal: number;
    proteinG: number;
    waterMl: number;
  }[] = [];

  for (const day of recentUserDays ?? []) {
    const { data: meals } = await supabase
      .from("meals")
      .select("id")
      .eq("user_day_id", day.id);
    const mealIds = meals?.map((meal) => meal.id) ?? [];

    let kcal = 0;
    let proteinG = 0;
    if (mealIds.length > 0) {
      const { data: items } = await supabase
        .from("meal_items")
        .select("kcal, protein_g")
        .in("meal_id", mealIds);
      for (const item of items ?? []) {
        kcal += Number(item.kcal);
        proteinG += Number(item.protein_g);
      }
    }

    const { data: waterLogs } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_day_id", day.id);
    const waterMl =
      waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0;

    recentDays.push({
      date: new Date(day.woke_at).toLocaleDateString("ru-RU"),
      kcal: Math.round(kcal),
      proteinG: Math.round(proteinG),
      waterMl,
    });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data: weightLogs } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("profile_id", profileId)
    .gte("measured_at", since.toISOString())
    .order("measured_at", { ascending: true });

  const weights = (weightLogs ?? []).map((log) => Number(log.weight_kg));

  return {
    userDay,
    context: {
      displayName: profile.display_name as string,
      targetKcal: (profile.target_kcal as number) ?? 0,
      targetProteinG: (profile.target_protein_g as number) ?? 0,
      targetWaterMl: (profile.target_water_ml as number) ?? 2500,
      dayTemplateType: userDay?.day_template_type ?? "night_shift",
      currentWeightKg: weights.at(-1) ?? null,
      weightAvg7d: rollingAverage(weights),
      recentDays,
    },
  };
}

export async function getMenuSuggestion(profileId: string, userDayId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("content_json")
    .eq("profile_id", profileId)
    .eq("user_day_id", userDayId)
    .eq("insight_type", "menu_suggestion")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.content_json ?? null;
}

export async function getFoodTemplates(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_templates")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });

  return data ?? [];
}

export async function getDayTemplates(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("day_templates")
    .select("*")
    .eq("profile_id", profileId);

  return data ?? [];
}

export async function getProgressData(profileId: string, days = 30) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [{ data: weights }, { data: userDays }] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("weight_kg, measured_at")
      .eq("profile_id", profileId)
      .gte("measured_at", since.toISOString())
      .order("measured_at", { ascending: true }),
    supabase
      .from("user_days")
      .select("id, woke_at")
      .eq("profile_id", profileId)
      .gte("woke_at", since.toISOString())
      .order("woke_at", { ascending: true }),
  ]);

  const dayIds = userDays?.map((day) => day.id) ?? [];
  let caloriesByDay: { date: string; kcal: number }[] = [];

  if (dayIds.length > 0) {
    const { data: meals } = await supabase
      .from("meals")
      .select("id, user_day_id")
      .in("user_day_id", dayIds);

    const mealIds = meals?.map((meal) => meal.id) ?? [];
    if (mealIds.length > 0) {
      const { data: items } = await supabase
        .from("meal_items")
        .select("meal_id, kcal, protein_g")
        .in("meal_id", mealIds);

      const mealToDay = new Map(
        meals?.map((meal) => [meal.id, meal.user_day_id]) ?? [],
      );
      const dayToDate = new Map(
        userDays?.map((day) => [
          day.id,
          new Date(day.woke_at).toLocaleDateString("ru-RU"),
        ]) ?? [],
      );

      const totalsMap = new Map<string, { kcal: number; protein: number }>();
      for (const item of items ?? []) {
        const dayId = mealToDay.get(item.meal_id);
        if (!dayId) continue;
        const date = dayToDate.get(dayId);
        if (!date) continue;
        const current = totalsMap.get(date) ?? { kcal: 0, protein: 0 };
        current.kcal += Number(item.kcal);
        current.protein += Number(item.protein_g);
        totalsMap.set(date, current);
      }

      caloriesByDay = [...totalsMap.entries()].map(([date, value]) => ({
        date,
        kcal: value.kcal,
      }));
    }
  }

  return {
    weights:
      weights?.map((row) => ({
        date: new Date(row.measured_at).toLocaleDateString("ru-RU"),
        weight: Number(row.weight_kg),
      })) ?? [],
    caloriesByDay,
  };
}
