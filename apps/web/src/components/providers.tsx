// Providers shell — add global client-side context providers here as needed.
// Currently empty since React 19 Server Components handle data fetching
// and cookie-based auth removes the need for a client auth store.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

