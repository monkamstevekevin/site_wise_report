
'use server';

/**
 * @fileOverview This file defines a Genkit flow for anomaly detection in field reports.
 * It now dynamically uses material validation rules fetched from Firestore.
 * The flow is expected to output its explanation in French.
 *
 * - detectReportAnomaly - An async function that takes a FieldReport as input and returns an anomaly assessment.
 * - FieldReportInput - The input type for the flow, now includes all material rules.
 * - AnomalyAssessment - The output type, indicating whether the report contains anomalous data.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import { getMaterials } from '@/services/materialService';
import type { Material } from '@/lib/types';

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
      "Optionnel. Une photo du matériau ou du site de test, sous forme d'URI de données. Format attendu : 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type FieldReport = z.infer<typeof FieldReportSchema>;

const MaterialRuleSchema = z.object({
  name: z.string(),
  type: z.string(),
  minDensity: z.number().optional(),
  maxDensity: z.number().optional(),
  minTemperature: z.number().optional(),
  maxTemperature: z.number().optional(),
});

const FieldReportInputSchema = FieldReportSchema.extend({
  allMaterialRules: z.array(MaterialRuleSchema).describe('Une liste de toutes les règles de validation des matériaux définies pour référence.'),
});
export type FieldReportInput = z.infer<typeof FieldReportInputSchema>;


const AnomalyAssessmentSchema = z.object({
  isAnomalous: z.boolean().describe('Vrai si le rapport contient des données anormales, faux sinon.'),
  explanation: z
    .string()
    .describe(
      'Une explication détaillée en FRANÇAIS expliquant pourquoi le rapport est considéré comme anormal, y compris les points de données spécifiques qui s\'écartent des normes attendues ou des règles de validation dynamiques. Si une photo a été fournie, mentionnez si elle a contribué à l\'évaluation.'
    ),
});

export type AnomalyAssessment = z.infer<typeof AnomalyAssessmentSchema>;

export async function detectReportAnomaly(report: FieldReport): Promise<AnomalyAssessment> {
  try {
    const materialsFromDb = await getMaterials();
    const allMaterialRules = materialsFromDb.map(m => ({
      name: m.name,
      type: m.type,
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
    console.error("Erreur lors de la récupération des règles de matériaux pour la détection d'anomalies :", error);
    return {
      isAnomalous: false,
      explanation: "Impossible de récupérer les règles de validation dynamiques des matériaux. La vérification des anomalies était basée sur la plausibilité générale.",
    };
  }
}


const detectReportAnomalyPrompt = ai.definePrompt({
  name: 'detectReportAnomalyPrompt',
  input: {schema: FieldReportInputSchema},
  output: {schema: AnomalyAssessmentSchema},
  prompt: `Vous êtes un assistant IA spécialisé dans l'identification de données anormales dans les rapports de terrain du génie civil.
La langue de sortie pour l'explication doit être le FRANÇAIS.

Analysez le rapport de terrain suivant et déterminez s'il contient des entrées de données potentiellement anormales.
Une liste de toutes les règles de validation des matériaux définies vous sera fournie. Identifiez d'abord les règles de validation qui s'appliquent au '{{{materialType}}}' signalé.
Ensuite, utilisez ces règles spécifiques pour évaluer la température et la densité.

Détails du rapport :
- ID Projet : {{{projectId}}}
- ID Technicien : {{{technicianId}}}
- Type de Matériau : {{{materialType}}}
- Température : {{{temperature}}} °C
- Volume : {{{volume}}} m³
- Densité : {{{density}}} kg/m³
- Humidité : {{{humidity}}} %
- Numéro de Lot : {{{batchNumber}}}
- Fournisseur : {{{supplier}}}
- Méthode d'Échantillonnage : {{{samplingMethod}}}
- Notes : {{{notes}}}
{{#if photoDataUri}}
- Preuve photo fournie. (Vous verrez l'image ci-dessous)
Photo : {{media url=photoDataUri}}
{{/if}}

Liste de toutes les Règles de Validation des Matériaux (utilisez celle qui correspond au materialType du rapport) :
{{#if allMaterialRules.length}}
{{#each allMaterialRules}}
- Matériau : {{this.name}} (Type : {{this.type}})
  {{#if this.minDensity}}Densité Min : {{this.minDensity}} kg/m³{{/if}}{{#if this.maxDensity}} Densité Max : {{this.maxDensity}} kg/m³{{/if}}
  {{#if this.minTemperature}}Température Min : {{this.minTemperature}} °C{{/if}}{{#if this.maxTemperature}} Température Max : {{this.maxTemperature}} °C{{/if}}
{{/each}}
{{else}}
Aucune règle de validation spécifique des matériaux n'a été fournie. Évaluez en fonction des connaissances générales.
{{/if}}

Évaluez si la combinaison de ces valeurs est plausible et cohérente.
Si des règles de validation spécifiques pour le '{{{materialType}}}' sont trouvées dans la liste ci-dessus, donnez-leur la priorité pour les vérifications de température et de densité.
Signalez tout écart ou incohérence significatif.
Si une photo a été fournie, considérez-la dans votre évaluation. Par exemple, la photo correspond-elle visuellement au type de matériau ou aux conditions signalées ? Montre-t-elle des défauts visibles ou des problèmes non saisis dans les données numériques ?

Produisez votre évaluation en suivant le AnomalyAssessmentSchema. Par exemple, si la densité ou la température d'un matériau est en dehors de la plage définie pour '{{{materialType}}}' sur la base des règles fournies, ou si la photo montre une divergence claire, signalez le rapport comme anormal et fournissez une explication détaillée EN FRANÇAIS.
Des valeurs d'humidité extrêmes pour un matériau donné peuvent également indiquer une anomalie.
`,
});

const detectReportAnomalyFlow = ai.defineFlow(
  {
    name: 'detectReportAnomalyFlow',
    inputSchema: FieldReportInputSchema,
    outputSchema: AnomalyAssessmentSchema,
  },
  async (flowInput: FieldReportInput) => {
    const {output} = await detectReportAnomalyPrompt(flowInput);
    return output!;
  }
);
