"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithPassword, signUpWithPassword } from "@/lib/actions";

type AuthState = {
  error?: string;
  success?: string;
};

const initialState: AuthState = {};

function Message({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        {state.success}
      </p>
    );
  }

  return null;
}

export function LoginForm() {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    initialState,
  );

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <form action={signInAction} className="space-y-4">
        <h2 className="text-lg font-medium">Войти</h2>
        <Message state={signInState} />
        <label className="block space-y-2 text-sm">
          <span className="text-zinc-400">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-zinc-400">Пароль</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={signInPending}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-medium text-zinc-950 disabled:opacity-60"
        >
          {signInPending ? "Входим..." : "Войти"}
        </button>
      </form>

      <div className="border-t border-zinc-800 pt-6">
        <form action={signUpAction} className="space-y-4">
          <h2 className="text-lg font-medium">Создать аккаунт</h2>
          <Message state={signUpState} />
          <label className="block space-y-2 text-sm">
            <span className="text-zinc-400">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-zinc-400">Пароль</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={signUpPending}
            className="w-full rounded-xl border border-zinc-700 px-4 py-3 font-medium text-zinc-100 disabled:opacity-60"
          >
            {signUpPending ? "Создаём..." : "Зарегистрироваться"}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Приложение не заменяет консультацию врача.{" "}
        <Link href="/onboarding" className="text-emerald-400">
          Подробнее
        </Link>
      </p>
    </div>
  );
}
