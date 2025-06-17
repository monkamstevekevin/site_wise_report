
'use server';
/**
 * @fileOverview A Genkit flow to compose content for a project assignment notification.
 * The output is a simple subject and HTML body for an email.
 *
 * - generateAssignmentNotificationEmail - Generates subject and body for the notification.
 * - AssignmentNotificationInput - Input type for the flow.
 * - AssignmentNotificationOutput - Output type for the flow (subject and body).
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';

const AssignmentNotificationInputSchema = z.object({
  userName: z.string().describe("Le nom de l'utilisateur assigné au projet."),
  projectName: z.string().describe("Le nom du projet assigné."),
  projectLocation: z.string().describe("L'emplacement/adresse du projet."),
  assignerName: z.string().describe("Le nom de l'administrateur ou du superviseur qui assigne le projet."),
  appName: z.string().default("SiteWise Reports").describe("Le nom de l'application."),
  appUrl: z.string().describe("L'URL de base de l'application pour les liens.")
});
export type AssignmentNotificationInput = z.infer<typeof AssignmentNotificationInputSchema>;

const AssignmentNotificationOutputSchema = z.object({
  emailSubject: z.string().describe("Un sujet concis pour l'e-mail de notification, incluant le nom du projet."),
  emailBody: z.string().describe("Le corps HTML complet de l'e-mail, incluant une salutation, les détails du projet, un lien d'appel à l'action, et des remarques de clôture."),
});
export type AssignmentNotificationOutput = z.infer<typeof AssignmentNotificationOutputSchema>;

export async function generateAssignmentNotificationEmail(
  input: AssignmentNotificationInput
): Promise<AssignmentNotificationOutput> {
  return assignmentNotificationFlow(input);
}

const assignmentNotificationPrompt = ai.definePrompt({
  name: 'assignmentNotificationEmailPrompt',
  input: {schema: AssignmentNotificationInputSchema},
  output: {schema: AssignmentNotificationOutputSchema},
  prompt: `Vous êtes un assistant chargé de générer le contenu d'un e-mail de notification d'assignation de projet pour l'application "{{appName}}".
L'utilisateur "{{userName}}" a été assigné au projet "{{projectName}}" (situé à "{{projectLocation}}") par "{{assignerName}}".
L'URL de l'application est {{appUrl}}.

Générez ce qui suit pour l'e-mail (EN FRANÇAIS) :
1.  emailSubject: Un sujet clair et concis indiquant une nouvelle assignation de projet et mentionnant le nom du projet.
2.  emailBody: Le corps HTML complet de l'e-mail. Il doit inclure :
    - Une salutation polie à {{userName}}.
    - Une introduction indiquant qu'il/elle a été assigné(e) à {{projectName}} par {{assignerName}}.
    - Le nom et l'emplacement du projet clairement affichés.
    - Un appel à l'action, comme un bouton ou un lien, avec un texte comme "Voir les détails du projet dans {{appName}}" ou "Accéder à {{appName}}", pointant vers {{appUrl}}/my-projects ou une page de projet pertinente.
    - Une formule de politesse.
    - Une structure HTML de base (par ex., paragraphes <p>, sauts de ligne <br>, gras <strong>, liens <a>). Assurez-vous que le lien est fonctionnel en utilisant {{appUrl}}.

Exemple de structure du corps de l'e-mail :
<p>Bonjour {{userName}},</p>
<p>Vous avez été assigné(e) à un nouveau projet par {{assignerName}} :</p>
<p><strong>Projet :</strong> {{projectName}}</p>
<p><strong>Lieu :</strong> {{projectLocation}}</p>
<p>Vous pouvez trouver plus de détails en vous connectant à {{appName}}.</p>
<p><a href="{{appUrl}}/my-projects" target="_blank">Voir les détails du projet dans {{appName}}</a></p>
<p>Cordialement,<br>L'équipe {{appName}}</p>

Assurez-vous que le ton est professionnel et encourageant.
La sortie finale pour emailBody doit être une seule chaîne contenant du HTML valide.
La langue de sortie doit être le FRANÇAIS.
`,
});

const assignmentNotificationFlow = ai.defineFlow(
  {
    name: 'assignmentNotificationEmailFlow',
    inputSchema: AssignmentNotificationInputSchema,
    outputSchema: AssignmentNotificationOutputSchema,
  },
  async input => {
    const {output} = await assignmentNotificationPrompt(input);
    return output!;
  }
);
