import { createClient } from "@/lib/supabase/server";
import { rollingAverage } from "@/lib/calculations";
import {
  calendarGrid,
  dayRangeUtc,
  toDateKey,
  type CalendarDayCell,
} from "@/lib/calendar";
import type { DashboardSummary, Profile, UserDay, DayTemplateType } from "@/lib/types";

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

export type FoodLogEntry = {
  id: string;
  name: string;
  grams: number | null;
  kcal: number;
  proteinG: number;
  eatenAt: string;
  mealType: string;
};

export async function getTodayFoodLog(
  profileId: string,
): Promise<FoodLogEntry[]> {
  const userDay = await getOpenUserDay(profileId);
  if (!userDay) return [];

  const supabase = await createClient();
  const { data: meals } = await supabase
    .from("meals")
    .select("id, eaten_at, meal_type")
    .eq("user_day_id", userDay.id)
    .order("eaten_at", { ascending: true });

  const mealIds = meals?.map((m) => m.id) ?? [];
  if (mealIds.length === 0) return [];

  const { data: items } = await supabase
    .from("meal_items")
    .select("id, meal_id, name, grams, kcal, protein_g")
    .in("meal_id", mealIds)
    .order("created_at", { ascending: true });

  const mealMeta = new Map(
    meals?.map((m) => [m.id, { eatenAt: m.eaten_at, mealType: m.meal_type }]) ??
      [],
  );

  return (items ?? []).map((item) => {
    const meta = mealMeta.get(item.meal_id);
    return {
      id: item.id,
      name: item.name,
      grams: item.grams,
      kcal: Number(item.kcal),
      proteinG: Number(item.protein_g),
      eatenAt: meta?.eatenAt ?? "",
      mealType: meta?.mealType ?? "snack",
    };
  });
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

export async function getCalendarMonth(
  profileId: string,
  month: Date,
  tz = "Europe/Moscow",
): Promise<CalendarDayCell[]> {
  const supabase = await createClient();
  const grid = calendarGrid(month);
  const firstKey = grid[0]?.dateKey;
  const lastKey = grid[grid.length - 1]?.dateKey;
  if (!firstKey || !lastKey) return [];

  const rangeStart = dayRangeUtc(firstKey, tz).start;
  const rangeEnd = dayRangeUtc(lastKey, tz).end;

  const [{ data: plans }, { data: userDays }] = await Promise.all([
    supabase
      .from("schedule_plans")
      .select("plan_date, day_template_type")
      .eq("profile_id", profileId)
      .gte("plan_date", firstKey)
      .lte("plan_date", lastKey),
    supabase
      .from("user_days")
      .select("id, woke_at, day_template_type")
      .eq("profile_id", profileId)
      .gte("woke_at", rangeStart)
      .lte("woke_at", rangeEnd),
  ]);

  const planMap = new Map(
    (plans ?? []).map((p) => [
      p.plan_date as string,
      p.day_template_type as DayTemplateType,
    ]),
  );

  const userDayByDate = new Map<string, { id: string; type: DayTemplateType }>();
  for (const day of userDays ?? []) {
    const key = toDateKey(new Date(day.woke_at), tz);
    userDayByDate.set(key, {
      id: day.id,
      type: day.day_template_type as DayTemplateType,
    });
  }

  const dayIds = [...userDayByDate.values()].map((d) => d.id);
  const totalsByDayId = new Map<
    string,
    { kcal: number; proteinG: number; hasFood: boolean }
  >();

  if (dayIds.length > 0) {
    const { data: meals } = await supabase
      .from("meals")
      .select("id, user_day_id")
      .in("user_day_id", dayIds);

    const mealIds = meals?.map((m) => m.id) ?? [];
    const mealToDay = new Map(
      meals?.map((m) => [m.id, m.user_day_id as string]) ?? [],
    );

    if (mealIds.length > 0) {
      const { data: items } = await supabase
        .from("meal_items")
        .select("meal_id, kcal, protein_g")
        .in("meal_id", mealIds);

      for (const item of items ?? []) {
        const dayId = mealToDay.get(item.meal_id);
        if (!dayId) continue;
        const current = totalsByDayId.get(dayId) ?? {
          kcal: 0,
          proteinG: 0,
          hasFood: false,
        };
        current.kcal += Number(item.kcal);
        current.proteinG += Number(item.protein_g);
        current.hasFood = true;
        totalsByDayId.set(dayId, current);
      }
    }
  }

  return grid.map(({ dateKey, inMonth }) => {
    const actual = userDayByDate.get(dateKey);
    const totals = actual ? totalsByDayId.get(actual.id) : null;
    return {
      dateKey,
      inMonth,
      planType: planMap.get(dateKey) ?? null,
      actualType: actual?.type ?? null,
      kcal: totals?.kcal ?? null,
      proteinG: totals?.proteinG ?? null,
      hasFood: totals?.hasFood ?? false,
    };
  });
}

export type DayDetail = {
  dateKey: string;
  planType: DayTemplateType | null;
  userDay: UserDay | null;
  foodLog: FoodLogEntry[];
  totals: {
    kcal: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    waterMl: number;
  };
  weights: { weightKg: number; measuredAt: string }[];
};

export async function getDayDetail(
  profileId: string,
  dateKey: string,
  tz = "Europe/Moscow",
): Promise<DayDetail> {
  const supabase = await createClient();
  const { start, end } = dayRangeUtc(dateKey, tz);

  const [{ data: plan }, { data: userDays }, { data: weightLogs }] =
    await Promise.all([
      supabase
        .from("schedule_plans")
        .select("day_template_type")
        .eq("profile_id", profileId)
        .eq("plan_date", dateKey)
        .maybeSingle(),
      supabase
        .from("user_days")
        .select("*")
        .eq("profile_id", profileId)
        .gte("woke_at", start)
        .lte("woke_at", end)
        .order("woke_at", { ascending: false })
        .limit(1),
      supabase
        .from("weight_logs")
        .select("weight_kg, measured_at")
        .eq("profile_id", profileId)
        .gte("measured_at", start)
        .lte("measured_at", end)
        .order("measured_at", { ascending: true }),
    ]);

  const userDay = (userDays?.[0] as UserDay | undefined) ?? null;
  const foodLog = userDay ? await getFoodLogForUserDay(userDay.id) : [];

  const totals = {
    kcal: 0,
    proteinG: 0,
    fatG: 0,
    carbsG: 0,
    waterMl: 0,
  };

  if (userDay) {
    const { data: meals } = await supabase
      .from("meals")
      .select("id")
      .eq("user_day_id", userDay.id);
    const mealIds = meals?.map((m) => m.id) ?? [];

    if (mealIds.length > 0) {
      const { data: items } = await supabase
        .from("meal_items")
        .select("kcal, protein_g, fat_g, carbs_g")
        .in("meal_id", mealIds);
      for (const item of items ?? []) {
        totals.kcal += Number(item.kcal);
        totals.proteinG += Number(item.protein_g);
        totals.fatG += Number(item.fat_g);
        totals.carbsG += Number(item.carbs_g);
      }
    }

    const { data: waterLogs } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_day_id", userDay.id);
    totals.waterMl =
      waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0;
  }

  return {
    dateKey,
    planType: (plan?.day_template_type as DayTemplateType | undefined) ?? null,
    userDay,
    foodLog,
    totals,
    weights:
      weightLogs?.map((w) => ({
        weightKg: Number(w.weight_kg),
        measuredAt: w.measured_at as string,
      })) ?? [],
  };
}

async function getFoodLogForUserDay(userDayId: string): Promise<FoodLogEntry[]> {
  const supabase = await createClient();
  const { data: meals } = await supabase
    .from("meals")
    .select("id, eaten_at, meal_type")
    .eq("user_day_id", userDayId)
    .order("eaten_at", { ascending: true });

  const mealIds = meals?.map((m) => m.id) ?? [];
  if (mealIds.length === 0) return [];

  const { data: items } = await supabase
    .from("meal_items")
    .select("id, meal_id, name, grams, kcal, protein_g")
    .in("meal_id", mealIds)
    .order("created_at", { ascending: true });

  const mealMeta = new Map(
    meals?.map((m) => [m.id, { eatenAt: m.eaten_at, mealType: m.meal_type }]) ??
      [],
  );

  return (items ?? []).map((item) => {
    const meta = mealMeta.get(item.meal_id);
    return {
      id: item.id,
      name: item.name,
      grams: item.grams,
      kcal: Number(item.kcal),
      proteinG: Number(item.protein_g),
      eatenAt: meta?.eatenAt ?? "",
      mealType: meta?.mealType ?? "snack",
    };
  });
}
