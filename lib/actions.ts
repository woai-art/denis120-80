"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  calculateAge,
  calculateTargets,
  estimateMonthsToGoal,
} from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";
import { buildDayContext } from "@/lib/data";
import {
  generateDailyInsight,
  generateMenuSuggestion,
  PROMPT_VERSION,
} from "@/lib/gemini";
import { getAppUrl } from "@/lib/app-url";
import { mapDbError, type ActionState } from "@/lib/action-result";
import { DAY_TYPE_META } from "@/lib/calendar";
import { COMMON_FOODS } from "@/lib/common-foods";
import { scaleNutrition } from "@/lib/nutrition";
import {
  getUserProductById,
  upsertUserProduct,
} from "@/lib/user-products";
import {
  DEFAULT_FOOD_TEMPLATES,
  DEFAULT_SCHEDULES,
  type DayTemplateType,
} from "@/lib/types";

const onboardingSchema = z.object({
  displayName: z.string().min(1),
  heightCm: z.coerce.number().min(120).max(230),
  birthYear: z.coerce.number().min(1940).max(2010),
  startWeightKg: z.coerce.number().min(40).max(300),
  targetWeightKg: z.coerce.number().min(40).max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active"]),
  medicalAck: z.literal("on"),
});

type AuthState = {
  error?: string;
  success?: string;
};

export type StartDayState = ActionState;
export type SchedulePlanState = ActionState;

const PLAN_CYCLE: (DayTemplateType | null)[] = [
  null,
  "night_shift",
  "recovery",
  "day_off",
];

function mapAuthError(message: string) {
  if (message.includes("Email not confirmed")) {
    return "Подтвердите email по ссылке из письма Supabase, затем войдите снова.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (message.includes("over_email_send_rate_limit")) {
    return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  }
  return message;
}

export async function signInWithPassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
    },
  });
  if (error) {
    return { error: mapAuthError(error.message) };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  return {
    success:
      "Аккаунт создан. Проверьте почту и подтвердите email, затем войдите.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    heightCm: formData.get("heightCm"),
    birthYear: formData.get("birthYear"),
    startWeightKg: formData.get("startWeightKg"),
    targetWeightKg: formData.get("targetWeightKg"),
    activityLevel: formData.get("activityLevel"),
    medicalAck: formData.get("medicalAck"),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const age = calculateAge(parsed.data.birthYear);
  const targets = calculateTargets({
    weightKg: parsed.data.startWeightKg,
    heightCm: parsed.data.heightCm,
    age,
    activityLevel: parsed.data.activityLevel,
  });

  const targetMonths = estimateMonthsToGoal({
    startWeightKg: parsed.data.startWeightKg,
    targetWeightKg: parsed.data.targetWeightKg,
  });

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: parsed.data.displayName,
    height_cm: parsed.data.heightCm,
    gender: "male",
    birth_year: parsed.data.birthYear,
    start_weight_kg: parsed.data.startWeightKg,
    target_weight_kg: parsed.data.targetWeightKg,
    target_months: targetMonths,
    activity_level: parsed.data.activityLevel,
    timezone: "Europe/Moscow",
    medical_ack_at: new Date().toISOString(),
    tdee_kcal: targets.tdee,
    target_kcal: targets.targetKcal,
    target_protein_g: targets.targetProteinG,
    target_fat_g: targets.targetFatG,
    target_carbs_g: targets.targetCarbsG,
    target_water_ml: targets.targetWaterMl,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return;
  }

  const templateRows = (Object.keys(DEFAULT_SCHEDULES) as DayTemplateType[]).map(
    (templateType) => ({
      profile_id: user.id,
      template_type: templateType,
      schedule_json: DEFAULT_SCHEDULES[templateType],
    }),
  );

  await supabase.from("day_templates").upsert(templateRows, {
    onConflict: "profile_id,template_type",
  });

  await supabase.from("food_templates").upsert(
    DEFAULT_FOOD_TEMPLATES.map((template) => ({
      profile_id: user.id,
      ...template,
    })),
  );

  const wokeAt = new Date().toISOString();
  const { data: userDay } = await supabase
    .from("user_days")
    .insert({
      profile_id: user.id,
      day_template_type: "night_shift",
      woke_at: wokeAt,
    })
    .select("id")
    .single();

  await supabase.from("weight_logs").insert({
    profile_id: user.id,
    user_day_id: userDay?.id,
    measured_at: wokeAt,
    weight_kg: parsed.data.startWeightKg,
    is_primary: true,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function startDay(
  _prevState: StartDayState,
  formData: FormData,
): Promise<StartDayState> {
  const templateType = String(
    formData.get("dayTemplateType") ?? "night_shift",
  ) as DayTemplateType;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Нужно войти в аккаунт." };
  }

  const openDay = await supabase
    .from("user_days")
    .select("id")
    .eq("profile_id", user.id)
    .is("closed_at", null)
    .maybeSingle();

  if (openDay.error) {
    return { error: mapDbError(openDay.error.message) };
  }

  if (openDay.data?.id) {
    const { error: closeError } = await supabase
      .from("user_days")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", openDay.data.id);
    if (closeError) {
      return { error: mapDbError(closeError.message) };
    }
  }

  const { error } = await supabase.from("user_days").insert({
    profile_id: user.id,
    day_template_type: templateType,
    woke_at: new Date().toISOString(),
  });

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  return {
    success: `День начат (${DAY_TYPE_META[templateType].label}). Можно записывать еду.`,
  };
}

export async function addWater(amountMl: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: day } = await supabase
    .from("user_days")
    .select("id")
    .eq("profile_id", user.id)
    .is("closed_at", null)
    .maybeSingle();

  if (!day) return;

  await supabase.from("water_logs").insert({
    user_day_id: day.id,
    logged_at: new Date().toISOString(),
    amount_ml: amountMl,
  });

  revalidatePath("/dashboard");
}

export async function addWater250() {
  await addWater(250);
}

export async function addWater500() {
  await addWater(500);
}

export async function logWeight(formData: FormData) {
  const weightKg = Number(formData.get("weightKg"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: day } = await supabase
    .from("user_days")
    .select("id")
    .eq("profile_id", user.id)
    .is("closed_at", null)
    .maybeSingle();

  await supabase.from("weight_logs").insert({
    profile_id: user.id,
    user_day_id: day?.id ?? null,
    measured_at: new Date().toISOString(),
    weight_kg: weightKg,
    is_primary: true,
  });

  revalidatePath("/dashboard");
  revalidatePath("/progress");
}

export async function addFoodTemplate(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: template } = await supabase
    .from("food_templates")
    .select("*")
    .eq("id", templateId)
    .eq("profile_id", user.id)
    .single();

  if (!template) return;

  const { data: day } = await supabase
    .from("user_days")
    .select("id")
    .eq("profile_id", user.id)
    .is("closed_at", null)
    .maybeSingle();

  if (!day) return;

  const { data: meal } = await supabase
    .from("meals")
    .insert({
      user_day_id: day.id,
      eaten_at: new Date().toISOString(),
      meal_type: "snack",
    })
    .select("id")
    .single();

  await supabase.from("meal_items").insert({
    meal_id: meal!.id,
    name: template.name,
    grams: template.default_grams,
    kcal: template.kcal,
    protein_g: template.protein_g,
    fat_g: template.fat_g,
    carbs_g: template.carbs_g,
    source: "template",
  });

  revalidatePath("/dashboard");
  revalidatePath("/food");
}

export async function deleteMealItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) {
    return { error: "Запись не найдена." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Нужно войти в аккаунт." };
  }

  const { data: row, error: readError } = await supabase
    .from("meal_items")
    .select(
      `
      id,
      meal_id,
      name,
      meals (
        user_days (
          profile_id
        )
      )
    `,
    )
    .eq("id", itemId)
    .maybeSingle();

  if (readError) {
    return { error: mapDbError(readError.message) };
  }
  if (!row) {
    return { error: "Запись не найдена." };
  }

  const mealsRaw = row.meals as
    | { user_days: { profile_id: string } | { profile_id: string }[] | null }
    | { user_days: { profile_id: string } | { profile_id: string }[] | null }[]
    | null;
  const meals = Array.isArray(mealsRaw) ? mealsRaw[0] : mealsRaw;
  const userDays = meals?.user_days;
  const ownerId = Array.isArray(userDays)
    ? userDays[0]?.profile_id
    : userDays?.profile_id;

  if (ownerId !== user.id) {
    return { error: "Нет доступа к этой записи." };
  }

  const mealId = row.meal_id as string;
  const itemName = row.name as string;

  const { error: deleteError } = await supabase
    .from("meal_items")
    .delete()
    .eq("id", itemId);

  if (deleteError) {
    return { error: mapDbError(deleteError.message) };
  }

  const { count } = await supabase
    .from("meal_items")
    .select("id", { count: "exact", head: true })
    .eq("meal_id", mealId);

  if ((count ?? 0) === 0) {
    await supabase.from("meals").delete().eq("id", mealId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/food");
  revalidatePath("/schedule", "layout");

  return { success: `Удалено: ${itemName}` };
}

const per100gFoodSchema = z.object({
  name: z.string().min(1),
  grams: z.coerce.number().min(1).max(10000),
  mealType: z.enum(["breakfast", "main", "dinner", "snack"]).default("snack"),
  kcalPer100g: z.coerce.number().min(0),
  proteinPer100g: z.coerce.number().min(0),
  fatPer100g: z.coerce.number().min(0),
  carbsPer100g: z.coerce.number().min(0),
});

async function insertMealItem(params: {
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  mealType: string;
  source: string;
  barcode?: string | null;
  offProductId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: day } = await supabase
    .from("user_days")
    .select("id")
    .eq("profile_id", user.id)
    .is("closed_at", null)
    .maybeSingle();

  if (!day) return;

  const { data: meal } = await supabase
    .from("meals")
    .insert({
      user_day_id: day.id,
      eaten_at: new Date().toISOString(),
      meal_type: params.mealType,
    })
    .select("id")
    .single();

  await supabase.from("meal_items").insert({
    meal_id: meal!.id,
    name: params.name,
    grams: params.grams,
    kcal: params.kcal,
    protein_g: params.proteinG,
    fat_g: params.fatG,
    carbs_g: params.carbsG,
    source: params.source,
    barcode: params.barcode ?? null,
    off_product_id: params.offProductId ?? null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/food");
}

async function saveProductAndMeal(params: {
  name: string;
  grams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  mealType: string;
  source: string;
  barcode?: string | null;
  offProductId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const per100g = {
    kcalPer100g: params.kcalPer100g,
    proteinPer100g: params.proteinPer100g,
    fatPer100g: params.fatPer100g,
    carbsPer100g: params.carbsPer100g,
  };
  const scaled = scaleNutrition(per100g, params.grams);

  await insertMealItem({
    name: params.name,
    grams: scaled.grams,
    kcal: scaled.kcal,
    proteinG: scaled.proteinG,
    fatG: scaled.fatG,
    carbsG: scaled.carbsG,
    mealType: params.mealType,
    source: params.source,
    barcode: params.barcode,
    offProductId: params.offProductId,
  });

  await upsertUserProduct({
    profileId: user.id,
    name: params.name,
    grams: scaled.grams,
    per100g,
    barcode: params.barcode,
  });
}

export async function addManualFood(formData: FormData) {
  const parsed = per100gFoodSchema.safeParse({
    name: formData.get("name"),
    grams: formData.get("grams"),
    mealType: formData.get("mealType") ?? "snack",
    kcalPer100g: formData.get("kcalPer100g"),
    proteinPer100g: formData.get("proteinPer100g"),
    fatPer100g: formData.get("fatPer100g"),
    carbsPer100g: formData.get("carbsPer100g"),
  });

  if (!parsed.success) return;

  await saveProductAndMeal({
    name: parsed.data.name,
    grams: parsed.data.grams,
    kcalPer100g: parsed.data.kcalPer100g,
    proteinPer100g: parsed.data.proteinPer100g,
    fatPer100g: parsed.data.fatPer100g,
    carbsPer100g: parsed.data.carbsPer100g,
    mealType: parsed.data.mealType,
    source: "manual",
  });
}

export async function addCommonFood(formData: FormData) {
  const foodId = String(formData.get("foodId") ?? "");
  const grams = Number(formData.get("grams") ?? 0);
  const food = COMMON_FOODS.find((item) => item.id === foodId);
  if (!food || grams < 1) return;

  await saveProductAndMeal({
    name: food.name,
    grams,
    kcalPer100g: food.per100g.kcalPer100g,
    proteinPer100g: food.per100g.proteinPer100g,
    fatPer100g: food.per100g.fatPer100g,
    carbsPer100g: food.per100g.carbsPer100g,
    mealType: "snack",
    source: "common_food",
  });
}

export async function addMyProduct(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const grams = Number(formData.get("grams") ?? 0);
  if (!productId || grams < 1) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const product = await getUserProductById(user.id, productId);
  if (!product) return;

  await saveProductAndMeal({
    name: product.name,
    grams,
    kcalPer100g: product.per100g.kcalPer100g,
    proteinPer100g: product.per100g.proteinPer100g,
    fatPer100g: product.per100g.fatPer100g,
    carbsPer100g: product.per100g.carbsPer100g,
    mealType: "snack",
    source: "my_product",
    barcode: product.barcode,
  });
}

export async function saveUserBarcodeProduct(formData: FormData) {
  const parsed = per100gFoodSchema
    .extend({ barcode: z.string().min(6).max(14) })
    .safeParse({
      barcode: formData.get("barcode"),
      name: formData.get("name"),
      grams: formData.get("grams"),
      mealType: "snack",
      kcalPer100g: formData.get("kcalPer100g"),
      proteinPer100g: formData.get("proteinPer100g"),
      fatPer100g: formData.get("fatPer100g"),
      carbsPer100g: formData.get("carbsPer100g"),
    });

  if (!parsed.success) return;

  await saveProductAndMeal({
    name: parsed.data.name,
    grams: parsed.data.grams,
    kcalPer100g: parsed.data.kcalPer100g,
    proteinPer100g: parsed.data.proteinPer100g,
    fatPer100g: parsed.data.fatPer100g,
    carbsPer100g: parsed.data.carbsPer100g,
    mealType: "snack",
    source: "user_barcode",
    barcode: parsed.data.barcode,
  });
}

const DAILY_INSIGHT_LIMIT = 3;

export async function requestDailyInsight() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const built = await buildDayContext(user.id);
  if (!built?.userDay) return;

  const { count } = await supabase
    .from("ai_insights")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("user_day_id", built.userDay.id)
    .eq("insight_type", "daily_tip");

  if ((count ?? 0) >= DAILY_INSIGHT_LIMIT) return;

  try {
    const insight = await generateDailyInsight(built.context);

    await supabase.from("ai_insights").insert({
      profile_id: user.id,
      user_day_id: built.userDay.id,
      insight_type: "daily_tip",
      content_json: insight,
      prompt_version: PROMPT_VERSION,
    });
  } catch (error) {
    console.error("Daily insight generation failed:", error);
    return;
  }

  revalidatePath("/dashboard");
}

export async function requestMenuSuggestion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const built = await buildDayContext(user.id);
  if (!built?.userDay) return;

  const { count } = await supabase
    .from("ai_insights")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("user_day_id", built.userDay.id)
    .eq("insight_type", "menu_suggestion");

  if ((count ?? 0) >= 1) return;

  try {
    const menu = await generateMenuSuggestion(built.context);

    await supabase.from("ai_insights").insert({
      profile_id: user.id,
      user_day_id: built.userDay.id,
      insight_type: "menu_suggestion",
      content_json: menu,
      prompt_version: PROMPT_VERSION,
    });
  } catch (error) {
    console.error("Menu suggestion generation failed:", error);
    return;
  }

  revalidatePath("/dashboard");
}

const offFoodSchema = z.object({
  name: z.string().min(1),
  grams: z.coerce.number().min(1).max(5000),
  kcalPer100g: z.coerce.number().min(0),
  proteinPer100g: z.coerce.number().min(0),
  fatPer100g: z.coerce.number().min(0),
  carbsPer100g: z.coerce.number().min(0),
  barcode: z.string().optional(),
  offProductId: z.string().optional(),
});

export async function addOffFood(formData: FormData) {
  const parsed = offFoodSchema.safeParse({
    name: formData.get("name"),
    grams: formData.get("grams"),
    kcalPer100g: formData.get("kcalPer100g"),
    proteinPer100g: formData.get("proteinPer100g"),
    fatPer100g: formData.get("fatPer100g"),
    carbsPer100g: formData.get("carbsPer100g"),
    barcode: formData.get("barcode") || undefined,
    offProductId: formData.get("offProductId") || undefined,
  });

  if (!parsed.success) return;

  await saveProductAndMeal({
    name: parsed.data.name,
    grams: parsed.data.grams,
    kcalPer100g: parsed.data.kcalPer100g,
    proteinPer100g: parsed.data.proteinPer100g,
    fatPer100g: parsed.data.fatPer100g,
    carbsPer100g: parsed.data.carbsPer100g,
    mealType: "snack",
    source: parsed.data.barcode ? "barcode" : "open_food_facts",
    barcode: parsed.data.barcode ?? null,
    offProductId: parsed.data.offProductId ?? null,
  });
}

export async function logActivity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: day } = await supabase
    .from("user_days")
    .select("id")
    .eq("profile_id", user.id)
    .is("closed_at", null)
    .maybeSingle();

  if (!day) return;

  await supabase.from("activity_logs").insert({
    user_day_id: day.id,
    activity_type: String(formData.get("activityType") ?? "walk"),
    value: formData.get("steps") ? Number(formData.get("steps")) : null,
    duration_min: formData.get("durationMin")
      ? Number(formData.get("durationMin"))
      : null,
    logged_at: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
}

const schedulePlanSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayTemplateType: z.enum(["night_shift", "recovery", "day_off"]),
});

export async function setSchedulePlan(
  _prevState: SchedulePlanState,
  formData: FormData,
): Promise<SchedulePlanState> {
  const parsed = schedulePlanSchema.safeParse({
    dateKey: formData.get("dateKey"),
    dayTemplateType: formData.get("dayTemplateType"),
  });
  if (!parsed.success) {
    return { error: "Неверные данные плана." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Нужно войти в аккаунт." };
  }

  const { error } = await supabase.from("schedule_plans").upsert(
    {
      profile_id: user.id,
      plan_date: parsed.data.dateKey,
      day_template_type: parsed.data.dayTemplateType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,plan_date" },
  );

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/schedule");
  revalidatePath(`/schedule/${parsed.data.dateKey}`);
  return {
    success: `План сохранён: ${DAY_TYPE_META[parsed.data.dayTemplateType].label}`,
  };
}

export async function clearSchedulePlan(
  _prevState: SchedulePlanState,
  formData: FormData,
): Promise<SchedulePlanState> {
  const dateKey = String(formData.get("dateKey") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { error: "Неверная дата." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Нужно войти в аккаунт." };
  }

  const { error } = await supabase
    .from("schedule_plans")
    .delete()
    .eq("profile_id", user.id)
    .eq("plan_date", dateKey);

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/schedule");
  revalidatePath(`/schedule/${dateKey}`);
  return { success: "План снят." };
}

export async function cycleSchedulePlan(
  _prevState: SchedulePlanState,
  formData: FormData,
): Promise<SchedulePlanState> {
  const dateKey = String(formData.get("dateKey") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { error: "Неверная дата." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Нужно войти в аккаунт." };
  }

  const { data: current, error: readError } = await supabase
    .from("schedule_plans")
    .select("day_template_type")
    .eq("profile_id", user.id)
    .eq("plan_date", dateKey)
    .maybeSingle();

  if (readError) {
    return { error: mapDbError(readError.message) };
  }

  const currentType =
    (current?.day_template_type as DayTemplateType | undefined) ?? null;
  const idx = PLAN_CYCLE.indexOf(currentType);
  const nextType = PLAN_CYCLE[(idx + 1) % PLAN_CYCLE.length];

  if (nextType === null) {
    const { error } = await supabase
      .from("schedule_plans")
      .delete()
      .eq("profile_id", user.id)
      .eq("plan_date", dateKey);

    if (error) {
      return { error: mapDbError(error.message) };
    }

    revalidatePath("/schedule");
    revalidatePath(`/schedule/${dateKey}`);
    return { success: "План снят." };
  }

  const { error } = await supabase.from("schedule_plans").upsert(
    {
      profile_id: user.id,
      plan_date: dateKey,
      day_template_type: nextType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,plan_date" },
  );

  if (error) {
    return { error: mapDbError(error.message) };
  }

  revalidatePath("/schedule");
  revalidatePath(`/schedule/${dateKey}`);
  return { success: `План: ${DAY_TYPE_META[nextType].label}` };
}
