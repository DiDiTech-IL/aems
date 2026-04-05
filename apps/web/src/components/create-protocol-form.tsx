'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createProtocolAction, type ActionResult } from '../app/actions/content';

// ─── Submit button with pending state ─────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Creating…' : 'Create Protocol'}
    </button>
  );
}

// ─── Protocol create form ─────────────────────────────────────────────────────

const PHASES_PLACEHOLDER = JSON.stringify(
  [
    {
      id: 'phase-1',
      name: 'Assessment',
      order: 1,
      actions: [
        { id: 'check-unresponsive', label: 'Check for responsiveness', required: true },
        { id: 'call-for-help', label: 'Call for help / activate EMS', required: true },
      ],
      successCriteria: {
        requiredActionIds: ['check-unresponsive', 'call-for-help'],
        maxWrongActions: 2,
        timeLimitSeconds: 60,
      },
    },
  ],
  null,
  2,
);

const initialState: ActionResult = { success: false, error: '' };

export function CreateProtocolForm() {
  const [state, formAction] = useActionState(createProtocolAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.success && state.error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-300">
          Protocol Name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Adult Cardiac Arrest Protocol"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Version */}
      <div>
        <label htmlFor="version" className="mb-1 block text-sm font-medium text-gray-300">
          Version <span className="text-red-400">*</span>
        </label>
        <input
          id="version"
          name="version"
          type="text"
          required
          defaultValue="1.0.0"
          pattern="^\d+\.\d+\.\d+$"
          placeholder="1.0.0"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">Semantic version — e.g. 1.0.0</p>
      </div>

      {/* Care level */}
      <div>
        <label htmlFor="careLevel" className="mb-1 block text-sm font-medium text-gray-300">
          Care Level <span className="text-red-400">*</span>
        </label>
        <select
          id="careLevel"
          name="careLevel"
          required
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="BLS">BLS — Basic Life Support</option>
          <option value="ALS">ALS — Advanced Life Support</option>
        </select>
      </div>

      {/* Phases JSON */}
      <div>
        <label htmlFor="phases" className="mb-1 block text-sm font-medium text-gray-300">
          Phases (JSON) <span className="text-red-400">*</span>
        </label>
        <textarea
          id="phases"
          name="phases"
          required
          rows={18}
          defaultValue={PHASES_PLACEHOLDER}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Array of ProtocolPhase objects. Each phase requires{' '}
          <code className="text-gray-400">id</code>,{' '}
          <code className="text-gray-400">name</code>,{' '}
          <code className="text-gray-400">order</code>,{' '}
          <code className="text-gray-400">actions</code>, and{' '}
          <code className="text-gray-400">successCriteria</code>.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
