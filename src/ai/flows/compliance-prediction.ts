// src/ai/flows/compliance-prediction.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting compliance percentages based on historical data and current conditions.
 *
 * - predictCompliancePercentage - Predicts the compliance percentage based on the provided input.
 * - CompliancePredictionInput - The input type for the predictCompliancePercentage function.
 * - CompliancePredictionOutput - The output type for the predictCompliancePercentage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompliancePredictionInputSchema = z.object({
  historicalData: z
    .string()
    .describe('Historical compliance data, including dates, materials, and compliance status.'),
  currentConditions: z
    .string()
    .describe('Current project conditions, such as weather, staffing levels, and material availability.'),
  validationRules: z.string().describe('The rules and standards for material compliance.'),
});
export type CompliancePredictionInput = z.infer<typeof CompliancePredictionInputSchema>;

const CompliancePredictionOutputSchema = z.object({
  predictedCompliancePercentage: z
    .number()
    .describe(
      'The predicted compliance percentage (0-100) based on historical data and current conditions.'
    ),
  reasons: z.string().describe('The reasons and factors influencing the predicted compliance percentage.'),
  suggestedActions: z.string().describe('Suggested actions to improve compliance.'),
});

export type CompliancePredictionOutput = z.infer<typeof CompliancePredictionOutputSchema>;

export async function predictCompliancePercentage(
  input: CompliancePredictionInput
): Promise<CompliancePredictionOutput> {
  return compliancePredictionFlow(input);
}

const compliancePredictionPrompt = ai.definePrompt({
  name: 'compliancePredictionPrompt',
  input: {schema: CompliancePredictionInputSchema},
  output: {schema: CompliancePredictionOutputSchema},
  prompt: `You are an AI assistant designed to predict compliance percentages for civil engineering projects.

  Based on the historical compliance data, current project conditions, and material validation rules,
  predict the overall compliance percentage for the project.

  Historical Data: {{{historicalData}}}
Current Conditions: {{{currentConditions}}}
Validation Rules: {{{validationRules}}}

  Provide a predicted compliance percentage, explain the reasons behind the prediction,
  and suggest actions to improve compliance.
  Format the predictedCompliancePercentage as a number between 0 and 100.
  `,
});

const compliancePredictionFlow = ai.defineFlow(
  {
    name: 'compliancePredictionFlow',
    inputSchema: CompliancePredictionInputSchema,
    outputSchema: CompliancePredictionOutputSchema,
  },
  async input => {
    const {output} = await compliancePredictionPrompt(input);
    return output!;
  }
);
