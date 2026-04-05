import { z } from 'zod';

export const VitalsSchema = z.object({
  heartRate: z.number().int().min(0).max(300),
  systolicBP: z.number().int().min(0).max(300),
  diastolicBP: z.number().int().min(0).max(200),
  respiratoryRate: z.number().int().min(0).max(60),
  spO2: z.number().min(0).max(100),
  temperature: z.number().min(20).max(45),
  gcs: z.number().int().min(3).max(15),
  etco2: z.number().min(0).max(100).optional(),
  bloodGlucose: z.number().min(0).max(50).optional(),
});

export type Vitals = z.infer<typeof VitalsSchema>;

export const PatientStateSchema = z.object({
  vitals: VitalsSchema,
  symptoms: z.array(z.string()),
  airway: z.enum(['patent', 'compromised', 'obstructed']),
  breathing: z.enum(['normal', 'labored', 'absent']),
  circulation: z.enum(['normal', 'compromised', 'absent']),
  consciousness: z.enum(['alert', 'voice', 'pain', 'unresponsive']),
  notes: z.array(z.string()).optional(),
});

export type PatientState = z.infer<typeof PatientStateSchema>;
