'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_INTERNAL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

export interface LoginFormState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { error: 'Email and password are required.' };
  }

  let token: string;
  try {
    const res = await fetch(`${API_INTERNAL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401) {
      return { error: 'Invalid email or password.' };
    }
    if (!res.ok) {
      return { error: 'An unexpected error occurred. Please try again.' };
    }

    const data = (await res.json()) as { token: string };
    token = data.token;
  } catch {
    return { error: 'Failed to reach the server. Please try again.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('aems_token', token, {
    path: '/',
    sameSite: 'lax',
    // httpOnly is false so the WebSocket client can read the token from document.cookie
    // Acceptable for this network-isolated training platform (no PHI stored)
    httpOnly: false,
    maxAge: 60 * 60 * 8, // 8 hours
    secure: process.env['NODE_ENV'] === 'production',
  });

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('aems_token');
  redirect('/login');
}
