'use client';

import { SignIn } from '@clerk/nextjs';

/**
 * Clerk-managed sign-in component.
 * Handles email/password, magic links, OAuth, and MFA out of the box.
 * After sign-in, Clerk redirects to /dashboard (configured via afterSignInUrl).
 */
export function LoginForm() {
  return (
    <SignIn
      routing="hash"
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'bg-transparent shadow-none p-0',
          headerTitle: 'hidden',
          headerSubtitle: 'hidden',
          socialButtonsBlockButton:
            'border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200',
          formButtonPrimary:
            'bg-blue-600 hover:bg-blue-500 text-white rounded-lg',
          formFieldInput:
            'rounded-lg border border-gray-600 bg-gray-800 text-gray-100 focus:border-blue-500',
          formFieldLabel: 'text-gray-400 text-sm',
          footerActionLink: 'text-blue-400 hover:text-blue-300',
          identityPreviewEditButton: 'text-blue-400',
          dividerLine: 'bg-gray-700',
          dividerText: 'text-gray-500',
        },
      }}
    />
  );
}
