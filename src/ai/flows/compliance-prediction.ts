
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
import { z } from 'zod';

const CompliancePredictionInputSchema = z.object({
  historicalData: z
    .string()
    .describe('Données historiques de conformité, incluant dates, matériaux, et statut de conformité.'),
  currentConditions: z
    .string()
    .describe('Conditions actuelles du projet, telles que la météo, les niveaux de personnel, et la disponibilité des matériaux.'),
  validationRules: z.string().describe('Les règles et standards pour la conformité des matériaux.'),
});
export type CompliancePredictionInput = z.infer<typeof CompliancePredictionInputSchema>;

const CompliancePredictionOutputSchema = z.object({
  predictedCompliancePercentage: z
    .number()
    .describe(
      'Le pourcentage de conformité prédit (0-100) basé sur les données historiques et les conditions actuelles.'
    ),
  reasons: z.string().describe('Les raisons et facteurs influençant le pourcentage de conformité prédit.'),
  suggestedActions: z.string().describe('Actions suggérées pour améliorer la conformité.'),
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
  prompt: `Vous êtes un assistant IA conçu pour prédire les pourcentages de conformité pour les projets de génie civil.

  Basé sur les données historiques de conformité, les conditions actuelles du projet, et les règles de validation des matériaux,
  prédisez le pourcentage de conformité global pour le projet. La réponse doit être en FRANÇAIS.

  Données Historiques : {{{historicalData}}}
Conditions Actuelles : {{{currentConditions}}}
Règles de Validation : {{{validationRules}}}

  Fournissez un pourcentage de conformité prédit, expliquez les raisons derrière la prédiction,
  et suggérez des actions pour améliorer la conformité.
  Formatez le predictedCompliancePercentage comme un nombre entre 0 et 100.
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
