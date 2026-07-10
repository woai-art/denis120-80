import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const callbackError =
    params?.error === "auth_callback"
      ? "Не удалось завершить вход по ссылке. Попробуйте войти вручную."
      : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">
          Denis120→80
        </p>
        <h1 className="text-3xl font-semibold">Вход в личный трекер</h1>
        <p className="text-sm text-zinc-400">
          Персональное приложение для похудения с учётом ночного графика.
        </p>
      </div>

      {callbackError ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {callbackError}
        </p>
      ) : null}

      <LoginForm />
    </main>
  );
}
