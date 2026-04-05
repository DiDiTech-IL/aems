'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, type LoginFormState } from '../app/actions/auth';

const INITIAL_STATE: LoginFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
