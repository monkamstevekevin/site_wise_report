
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
import { z } from 'zod'; // Corrected import

const AssignmentNotificationInputSchema = z.object({
  userName: z.string().describe("The name of the user being assigned the project."),
  projectName: z.string().describe("The name of the project being assigned."),
  projectLocation: z.string().describe("The location/address of the project."),
  assignerName: z.string().describe("The name of the admin or supervisor assigning the project."),
  appName: z.string().default("SiteWise Reports").describe("The name of the application."),
  appUrl: z.string().describe("The base URL of the application for links.")
});
export type AssignmentNotificationInput = z.infer<typeof AssignmentNotificationInputSchema>;

const AssignmentNotificationOutputSchema = z.object({
  emailSubject: z.string().describe("A concise subject line for the notification email, including the project name."),
  emailBody: z.string().describe("The full HTML body of the email, including a greeting, project details, a call to action link, and closing remarks."),
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
  prompt: `You are an assistant responsible for generating the content for a project assignment notification email for the application "{{appName}}".
The user "{{userName}}" has been assigned to the project "{{projectName}}" (located at "{{projectLocation}}") by "{{assignerName}}".
The application URL is {{appUrl}}.

Generate the following for the email:
1.  emailSubject: A clear and concise subject line indicating a new project assignment and mentioning the project name.
2.  emailBody: The full HTML body of the email. It should include:
    - A polite greeting to {{userName}}.
    - An introduction stating they've been assigned to {{projectName}} by {{assignerName}}.
    - The project name and location clearly displayed.
    - A call to action, like a button or link, with text like "View Project Details in {{appName}}" or "Access {{appName}}", linking to {{appUrl}}/my-projects or a relevant project page.
    - A friendly closing remark.
    - Basic HTML structure (e.g., paragraphs <p>, line breaks <br>, bold <strong>, links <a>). Ensure the link is functional using {{appUrl}}.

Example email body structure:
<p>Hello {{userName}},</p>
<p>You've been assigned to a new project by {{assignerName}}:</p>
<p><strong>Project:</strong> {{projectName}}</p>
<p><strong>Location:</strong> {{projectLocation}}</p>
<p>You can find more details by logging into {{appName}}.</p>
<p><a href="{{appUrl}}/my-projects" target="_blank">View Project Details in {{appName}}</a></p>
<p>Best regards,<br>The {{appName}} Team</p>

Ensure the tone is professional and encouraging.
The final output for emailBody should be a single string containing valid HTML.
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
