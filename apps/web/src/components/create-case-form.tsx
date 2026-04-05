'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createCaseAction, type ActionResult } from '../app/actions/content';
import type { ProtocolRow } from '../lib/server-api';

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Creating…' : 'Create Case'}
    </button>
  );
}

// ─── Protocol selector ─────────────────────────────────────────────────────────

function ProtocolSelector({ protocols }: { protocols: ProtocolRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-300">
        Allowed Protocols <span className="text-red-400">*</span>
      </label>
      {/* Hidden field carrying comma-separated IDs */}
      <input type="hidden" name="allowedProtocolIds" value={selected.join(',')} />

      {protocols.length === 0 ? (
        <p className="text-sm text-yellow-400">
          No published protocols available.{' '}
          <a href="/protocols/new" className="underline">
            Create and publish one first.
          </a>
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-lg border border-gray-700 bg-gray-900 p-3">
          {protocols.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 accent-blue-500"
              />
              <span className="text-sm">
                {p.name}
                <span className="ml-1.5 text-xs text-gray-500">
                  v{p.version} · {p.careLevel}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">{selected.length} protocol(s) selected</p>
      )}
    </div>
  );
}

// ─── Initial patient state placeholder ───────────────────────────────────────

const PATIENT_STATE_PLACEHOLDER = JSON.stringify(
  {
    vitals: {
      heartRate: 0,
      systolicBP: 0,
      diastolicBP: 0,
      respiratoryRate: 0,
      spO2: 100,
      temperature: 37.0,
      gcs: 15,
    },
    symptoms: [],
    airway: 'open',
    breathing: 'spontaneous',
    circulation: 'intact',
    consciousness: 'alert',
  },
  null,
  2,
);

const initialState: ActionResult = { success: false, error: '' };

// ─── Main form ─────────────────────────────────────────────────────────────────

export function CreateCaseForm({ protocols }: { protocols: ProtocolRow[] }) {
  const [state, formAction] = useActionState(createCaseAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.success && state.error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Basic info row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-300">
            Case Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Adult Cardiac Arrest — Witnessed OHCA"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

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
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

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
            <option value="BLS">BLS</option>
            <option value="ALS">ALS</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="difficultyLevel"
            className="mb-1 block text-sm font-medium text-gray-300"
          >
            Difficulty <span className="text-red-400">*</span>
          </label>
          <select
            id="difficultyLevel"
            name="difficultyLevel"
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="1">1 — Basic</option>
            <option value="2">2 — Intermediate</option>
            <option value="3">3 — Advanced</option>
          </select>
        </div>
      </div>

      {/* Scenario section */}
      <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">Scenario</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="chiefComplaint"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Chief Complaint <span className="text-red-400">*</span>
            </label>
            <input
              id="chiefComplaint"
              name="chiefComplaint"
              type="text"
              required
              placeholder="e.g. Unresponsive adult, no pulse"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="contextNarrative"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Context Narrative <span className="text-red-400">*</span>
            </label>
            <textarea
              id="contextNarrative"
              name="contextNarrative"
              required
              rows={3}
              placeholder="Describe the scenario context..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="setting"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Setting <span className="text-red-400">*</span>
              </label>
              <input
                id="setting"
                name="setting"
                type="text"
                required
                placeholder="e.g. Residential street"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="dispatchInfo"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Dispatch Info
              </label>
              <input
                id="dispatchInfo"
                name="dispatchInfo"
                type="text"
                placeholder="e.g. 911 call at 14:32"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Allowed protocols */}
      <ProtocolSelector protocols={protocols} />

      {/* Initial patient state */}
      <div>
        <label
          htmlFor="initialPatientState"
          className="mb-1 block text-sm font-medium text-gray-300"
        >
          Initial Patient State (JSON) <span className="text-red-400">*</span>
        </label>
        <textarea
          id="initialPatientState"
          name="initialPatientState"
          required
          rows={14}
          defaultValue={PATIENT_STATE_PLACEHOLDER}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Must conform to PatientState schema: vitals, symptoms, airway, breathing, circulation,
          consciousness.
        </p>
      </div>

      {/* Rules */}
      <div>
        <label htmlFor="rules" className="mb-1 block text-sm font-medium text-gray-300">
          Rules (JSON array)
        </label>
        <textarea
          id="rules"
          name="rules"
          rows={4}
          defaultValue="[]"
          spellCheck={false}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Deterministic trigger→effect rules. Leave empty for cases without deterioration logic.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
