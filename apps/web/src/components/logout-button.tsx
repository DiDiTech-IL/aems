'use client';

import { UserButton } from '@clerk/nextjs';

/**
 * Clerk UserButton — renders an avatar with a dropdown that includes:
 * - Profile management
 * - Switch accounts
 * - Sign out (redirects to /login)
 */
export function LogoutButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'w-8 h-8',
        },
      }}
    />
  );
}
