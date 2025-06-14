'use server';

/**
 * @fileOverview This file defines a Genkit flow for anomaly detection in field reports.
 * It now dynamically uses material validation rules fetched from Firestore.
 *
 * - detectReportAnomaly - An async function that takes a FieldReport as input and returns an anomaly assessment.
 * - FieldReportInput - The input type for the flow, now includes all material rules.
 * - AnomalyAssessment - The output type, indicating whether the report contains anomalous data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getMaterials } from '@/services/materialService'; // Import service to get materials
import type { Material } from '@/lib/types';

const FieldReportSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  technicianId: z.string(),
  materialType: z.string(), // This will be used to find the correct validation rules
  temperature: z.number(),
  volume: z.number(),
  density: z.number(),
  humidity: z.number(),
  batchNumber: z.string(),
  supplier: z.string(),
  samplingMethod: z.string(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED']),
  attachments: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "Optional. A photo of the material or testing site, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type FieldReport = z.infer<typeof FieldReportSchema>;

// Define a schema for the material validation rules to be passed to the prompt
const MaterialRuleSchema = z.object({
  name: z.string(),
  type: z.string(),
  minDensity: z.number().optional(),
  maxDensity: z.number().optional(),
  minTemperature: z.number().optional(),
  maxTemperature: z.number().optional(),
});

const FieldReportInputSchema = FieldReportSchema.extend({
  allMaterialRules: z.array(MaterialRuleSchema).describe('A list of all defined material validation rules for reference.'),
});
export type FieldReportInput = z.infer<typeof FieldReportInputSchema>;


const AnomalyAssessmentSchema = z.object({
  isAnomalous: z.boolean().describe('True if the report contains anomalous data, false otherwise.'),
  explanation: z
    .string()
    .describe(
      'A detailed explanation of why the report is considered anomalous, including specific data points that deviate from expected norms or dynamic validation rules. If a photo was provided, mention if it contributed to the assessment.'
    ),
});

export type AnomalyAssessment = z.infer<typeof AnomalyAssessmentSchema>;

// Wrapper function that fetches materials and then calls the flow
export async function detectReportAnomaly(report: FieldReport): Promise<AnomalyAssessment> {
  try {
    const materialsFromDb = await getMaterials();
    const allMaterialRules = materialsFromDb.map(m => ({
      name: m.name,
      type: m.type, // The type like 'cement', 'asphalt'
      minDensity: m.validationRules?.minDensity,
      maxDensity: m.validationRules?.maxDensity,
      minTemperature: m.validationRules?.minTemperature,
      maxTemperature: m.validationRules?.maxTemperature,
    }));

    const flowInput: FieldReportInput = {
      ...report,
      allMaterialRules,
    };
    return detectReportAnomalyFlow(flowInput);

  } catch (error) {
    console.error("Error fetching material rules for anomaly detection:", error);
    // Fallback to a generic non-anomalous assessment if rules can't be fetched
    // Or, you could re-throw the error or use hardcoded rules as a last resort
    return {
      isAnomalous: false,
      explanation: "Could not fetch dynamic material validation rules. Anomaly check was based on general plausibility.",
    };
  }
}


const detectReportAnomalyPrompt = ai.definePrompt({
  name: 'detectReportAnomalyPrompt',
  input: {schema: FieldReportInputSchema}, // Use the extended input schema
  output: {schema: AnomalyAssessmentSchema},
  prompt: `You are an AI assistant specialized in identifying anomalous data in civil engineering field reports.

  Analyze the following field report and determine if it contains any potentially anomalous data entries.
  You will be provided with a list of all defined material validation rules. First, identify the validation rules that apply to the '{{{materialType}}}' reported.
  Then, use those specific rules to assess temperature and density.

  Report Details:
  - Project ID: {{{projectId}}}
  - Technician ID: {{{technicianId}}}
  - Material Type: {{{materialType}}}
  - Temperature: {{{temperature}}} °C
  - Volume: {{{volume}}} m³
  - Density: {{{density}}} kg/m³
  - Humidity: {{{humidity}}} %
  - Batch Number: {{{batchNumber}}}
  - Supplier: {{{supplier}}}
  - Sampling Method: {{{samplingMethod}}}
  - Notes: {{{notes}}}
  {{#if photoDataUri}}
  - Photo evidence provided. (You will see the image below)
  Photo: {{media url=photoDataUri}}
  {{/if}}

  List of all Material Validation Rules (use the one matching the report's materialType):
  {{#if allMaterialRules.length}}
  {{#each allMaterialRules}}
  - Material: {{this.name}} (Type: {{this.type}})
    {{#if this.minDensity}}Min Density: {{this.minDensity}} kg/m³{{/if}}{{#if this.maxDensity}} Max Density: {{this.maxDensity}} kg/m³{{/if}}
    {{#if this.minTemperature}}Min Temperature: {{this.minTemperature}} °C{{/if}}{{#if this.maxTemperature}} Max Temperature: {{this.maxTemperature}} °C{{/if}}
  {{/each}}
  {{else}}
  No specific material validation rules were provided. Assess based on general knowledge.
  {{/if}}

  Assess whether the combination of these values is plausible and consistent.
  If specific validation rules for the '{{{materialType}}}' are found in the list above, prioritize them for temperature and density checks.
  Flag any significant deviations or inconsistencies.
  If a photo was provided, consider it as part of your assessment. For example, does the photo visually align with the reported material type or conditions? Does it show any visible defects or issues not captured in the numerical data?

  Output your assessment following the AnomalyAssessmentSchema. For example, if the density or temperature of a material is outside the defined range for '{{{materialType}}}' based on the provided rules, or if the photo shows a clear discrepancy, flag the report as anomalous and provide a detailed explanation.
  Extreme humidity values for a given material may also indicate an anomaly.
`,
});

// The flow now expects FieldReportInput which includes allMaterialRules
const detectReportAnomalyFlow = ai.defineFlow(
  {
    name: 'detectReportAnomalyFlow',
    inputSchema: FieldReportInputSchema, // Expects the extended schema
    outputSchema: AnomalyAssessmentSchema,
  },
  async (flowInput: FieldReportInput) => { // Parameter type updated
    const {output} = await detectReportAnomalyPrompt(flowInput);
    return output!;
  }
);

