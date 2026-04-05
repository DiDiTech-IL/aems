import { LoginForm } from '../../components/login-form';

// Server Component — no client JS needed for this shell.
// Auth state, validation, loading, and redirect are all handled by:
//   - loginAction (Server Action) → sets cookie + redirect
//   - LoginForm    (Client Component) → useActionState + useFormStatus
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-8">
        <h1 className="mb-6 text-2xl font-bold">Sign in to AEMS</h1>
        <LoginForm />
      </div>
    </main>
  );
}
