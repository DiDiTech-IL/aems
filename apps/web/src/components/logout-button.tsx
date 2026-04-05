'use client';

import { useFormStatus } from 'react-dom';
import { logoutAction } from '../app/actions/auth';

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:border-gray-400 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

// Progressive-enhancement form: works without JS, shows pending state with JS.
// logoutAction is a Server Action that deletes the cookie and redirects.
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SignOutButton />
    </form>
  );
}
