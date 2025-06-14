
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Heading,
  Link,
} from '@react-email/components';
import * as React from 'react';

interface AssignmentNotificationEmailProps {
  userName?: string;
  projectName?: string;
  projectLocation?: string;
  assignerName?: string;
  appUrl?: string; // Base URL of your application
  appName?: string;
  greeting?: string;
  detailsIntro?: string;
  callToActionText?: string;
  closingText?: string;
}

const APP_NAME_DEFAULT = 'SiteWise Reports';
const APP_URL_DEFAULT = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fallback for local dev
const LOGO_URL = `${APP_URL_DEFAULT}/logo-email.png`; // You might need to place a logo in /public/logo-email.png

export const AssignmentNotificationEmail: React.FC<Readonly<AssignmentNotificationEmailProps>> = ({
  userName = 'User',
  projectName = 'a new project',
  projectLocation = 'N/A',
  assignerName = 'The SiteWise Reports Team',
  appUrl = APP_URL_DEFAULT,
  appName = APP_NAME_DEFAULT,
  greeting = `Hello ${userName},`,
  detailsIntro = `You have been assigned to a new project by ${assignerName}:`,
  callToActionText = `View Project Details in ${appName}`,
  closingText = `We're excited to have you on this project!`,
}) => {
  const previewText = `New Project Assignment: ${projectName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={LOGO_URL}
            width="48"
            height="48"
            alt={`${appName} Logo`}
            style={logo}
            data-ai-hint="application logo"
          />
          <Heading style={heading}>New Project Assignment!</Heading>
          <Text style={paragraph}>{greeting}</Text>
          <Text style={paragraph}>
            {detailsIntro}
          </Text>
          <Section style={detailsSection}>
            <Text style={detailItem}>
              <strong>Project Name:</strong> {projectName}
            </Text>
            <Text style={detailItem}>
              <strong>Location:</strong> {projectLocation}
            </Text>
          </Section>
          <Text style={paragraph}>
            You can find more information about this project by logging into the {appName} application.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={`${appUrl}/my-projects`}> 
              {callToActionText}
            </Button>
          </Section>
          <Text style={paragraph}>
            {closingText}
            <br />
            Best regards,
            <br />
            The {appName} Team
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            This is an automated notification from {appName}. 
            If you have any questions, please contact your supervisor or administrator.
            <br/>
            {projectLocation ? `${projectLocation}` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AssignmentNotificationEmail;

const main = {
  backgroundColor: '#f0f2f5', // Light gray background
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
  backgroundColor: '#ffffff', // White card
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const logo = {
  margin: '0 auto',
  marginBottom: '24px',
};

const heading = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  textAlign: 'center' as const,
  color: '#2D3136', // Darker gray
  padding: '0 20px',
  fontFamily: '"Space Grotesk", sans-serif',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#3c4043', // Standard text color
  padding: '0 30px',
};

const detailsSection = {
  margin: '24px 30px',
  padding: '20px',
  backgroundColor: '#f8f9fa', // Very light gray for details box
  borderRadius: '4px',
  border: '1px solid #e9ecef', // Light border
};

const detailItem = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#3c4043',
  margin: '0 0 8px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7EA9D1', // Dusty Blue (Primary)
  borderRadius: '5px',
  color: '#ffffff', // White text
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
  fontFamily: '"Inter", sans-serif',
  fontWeight: '500',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  padding: '0 20px',
};
