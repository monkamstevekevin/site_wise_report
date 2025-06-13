
'use server';

/**
 * @fileOverview This file defines a Genkit flow for anomaly detection in field reports.
 *
 * - detectReportAnomaly - An async function that takes a FieldReport as input and returns an anomaly assessment.
 * - FieldReport - The input type, representing the field report data.
 * - AnomalyAssessment - The output type, indicating whether the report contains anomalous data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FieldReportSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  technicianId: z.string(),
  materialType: z.string(),
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

const AnomalyAssessmentSchema = z.object({
  isAnomalous: z.boolean().describe('True if the report contains anomalous data, false otherwise.'),
  explanation: z
    .string()
    .describe(
      'A detailed explanation of why the report is considered anomalous, including specific data points that deviate from expected norms or validation rules. If a photo was provided, mention if it contributed to the assessment.'
    ),
});

export type AnomalyAssessment = z.infer<typeof AnomalyAssessmentSchema>;

export async function detectReportAnomaly(report: FieldReport): Promise<AnomalyAssessment> {
  return detectReportAnomalyFlow(report);
}

const detectReportAnomalyPrompt = ai.definePrompt({
  name: 'detectReportAnomalyPrompt',
  input: {schema: FieldReportSchema},
  output: {schema: AnomalyAssessmentSchema},
  prompt: `You are an AI assistant specialized in identifying anomalous data in civil engineering field reports.

  Analyze the following field report and determine if it contains any potentially anomalous data entries, based on typical values, material properties, and validation rules. Explain your reasoning in detail.

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

  Assess whether the combination of these values is plausible and consistent. Consider typical ranges for each material type and flag any significant deviations or inconsistencies.
  If a photo was provided, consider it as part of your assessment. For example, does the photo visually align with the reported material type or conditions? Does it show any visible defects or issues not captured in the numerical data?

  Output your assessment following the AnomalyAssessmentSchema. For example, if the density of a material is unusually high or low for the given material type, or if the temperature and humidity combination seems implausible, or if the photo shows a clear discrepancy, flag the report as anomalous and provide a detailed explanation.

  Consider these validation rules:
  - Cement density should typically be between 1440 and 1600 kg/m³.
  - Asphalt density should typically be between 2240 and 2400 kg/m³.
  - Gravel density should typically be between 1600 and 1800 kg/m³.
  - Extreme temperature or humidity values for a given material may also indicate an anomaly.
`,
});

const detectReportAnomalyFlow = ai.defineFlow(
  {
    name: 'detectReportAnomalyFlow',
    inputSchema: FieldReportSchema,
    outputSchema: AnomalyAssessmentSchema,
  },
  async report => {
    const {output} = await detectReportAnomalyPrompt(report);
    return output!;
  }
);
