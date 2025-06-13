
'use server';
/**
 * @fileOverview A Genkit flow to compose an email notification for project assignment.
 *
 * - sendAssignmentNotification - Generates content for a project assignment email.
 * - AssignmentNotificationInput - Input type for the flow.
 * - AssignmentNotificationOutput - Output type for the flow (email subject and body).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssignmentNotificationInputSchema = z.object({
  userName: z.string().describe("The name of the user being assigned the project."),
  userEmail: z.string().email().describe("The email address of the user being assigned."),
  projectName: z.string().describe("The name of the project being assigned."),
  projectLocation: z.string().describe("The location/address of the project."),
  assignerName: z.string().describe("The name of the admin or supervisor assigning the project."),
});
export type AssignmentNotificationInput = z.infer<typeof AssignmentNotificationInputSchema>;

const AssignmentNotificationOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the notification email."),
  emailBody: z.string().describe("The full body content of the notification email. Use Markdown for formatting if appropriate (e.g., line breaks)."),
});
export type AssignmentNotificationOutput = z.infer<typeof AssignmentNotificationOutputSchema>;

export async function sendAssignmentNotification(
  input: AssignmentNotificationInput
): Promise<AssignmentNotificationOutput> {
  return assignmentNotificationFlow(input);
}

const assignmentNotificationPrompt = ai.definePrompt({
  name: 'assignmentNotificationPrompt',
  input: {schema: AssignmentNotificationInputSchema},
  output: {schema: AssignmentNotificationOutputSchema},
  prompt: `You are an assistant responsible for generating project assignment notification emails.
Compose a professional and friendly email to the user.

User to notify:
Name: {{{userName}}}
Email: {{{userEmail}}}

Project details:
Project Name: {{{projectName}}}
Project Location: {{{projectLocation}}}

Assigned by: {{{assignerName}}}

The email should:
1.  Have a clear subject line indicating a new project assignment.
2.  Greet the user by their name.
3.  Clearly state that they have been assigned to a new project and mention the project name.
4.  Provide the project location.
5.  Include a call to action, inviting the user to log in to the SiteWise Reports application for more details about the project.
6.  Be signed off by "The SiteWise Reports Team" or by {{{assignerName}}} on behalf of the team.

Generate the email subject and body. Ensure the email body is formatted with appropriate line breaks. For example, use '\n' for new lines if you're outputting plain text, or use Markdown syntax if that's more natural for email body generation.
`,
});

const assignmentNotificationFlow = ai.defineFlow(
  {
    name: 'assignmentNotificationFlow',
    inputSchema: AssignmentNotificationInputSchema,
    outputSchema: AssignmentNotificationOutputSchema,
  },
  async input => {
    const {output} = await assignmentNotificationPrompt(input);
    return output!;
  }
);
