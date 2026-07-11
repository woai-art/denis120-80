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
    message.includes("user_barcode_products") &&
    message.includes("does not exist")
  ) {
    return "Таблица штрих-кодов не создана. Выполни миграцию в Supabase.";
  }
  return message;
}
