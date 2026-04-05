'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { publishProtocolAction, type ActionResult } from '../app/actions/content';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Publishing…' : 'Publish Protocol'}
    </button>
  );
}

const initialState: ActionResult = { success: false, error: '' };

export function PublishProtocolForm({ id }: { id: string }) {
  const [state, formAction] = useActionState(publishProtocolAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      {state && !state.success && state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
