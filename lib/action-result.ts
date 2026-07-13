export type ActionState = {
  error?: string;
  success?: string;
};

export function mapDbError(message: string) {
  if (
    message.includes("schedule_plans") &&
    (message.includes("does not exist") || message.includes("schema cache"))
  ) {
    return "Таблица календаря не создана. Выполни миграцию schedule_plans в Supabase (SQL Editor).";
  }
  if (
    (message.includes("user_barcode_products") ||
      message.includes("user_products")) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  ) {
    return "Таблица «Мои продукты» не создана. Выполни миграцию user_products в Supabase.";
  }
  if (
    (message.includes("pantry_items") ||
      message.includes("purchases") ||
      message.includes("purchase_items")) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  ) {
    return "Таблицы холодильника не созданы. Выполни миграцию pantry_purchases в Supabase.";
  }
  return message;
}
