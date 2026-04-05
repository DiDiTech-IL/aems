import { CreateProtocolForm } from '../../../components/create-protocol-form';

export default function NewProtocolPage() {
  return (
    <main className="min-h-screen p-6">
      <nav className="mb-6">
        <a href="/protocols" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
          ← Back to Protocols
        </a>
      </nav>

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold">New Protocol</h1>
        <p className="mb-6 text-sm text-gray-400">
          Protocols are saved as drafts. An admin must publish them before they can be used in
          simulations.
        </p>

        <div className="rounded-xl border border-gray-700 bg-gray-950 p-8">
          <CreateProtocolForm />
        </div>
      </div>
    </main>
  );
}
