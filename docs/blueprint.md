# **App Name**: SiteWise Reports

## Core Features:

- Field Report Creation: Allows technicians to create and edit field reports with various inputs such as project, location, material, temperature, volume, density, humidity, batch number, supplier, sampling method, notes, and attachments.
- Report Management: Provides a sortable, filterable, searchable list of reports, with a detailed view including a timeline, attachments, and validation options for supervisors.
- Dashboard Analytics: Presents key performance indicators, graphs, and activity logs related to field reports and compliance. For example, an AI-powered compliance predictor analyzes past reports and conditions to forecast future compliance percentages.
- User Management: Enables administrators to add, edit, and manage users, assign roles, and manage technician assignments to projects. Roles could include Admin, Supervisor, and Technician.
- Project & Material Management: Allows administrators to manage projects and materials, define validation rules, and track project status and locations.
- Notification System: Provides an in-app notification system for updates and alerts, potentially expanding to include email notifications, to inform technicians and supervisors.
- AI-Powered Anomaly Detection: Uses an LLM to assess technician report details; the AI serves as a "tool" to identify potential data discrepancies based on validation rules and historical data.

## Style Guidelines:

- Primary color: Dusty Blue (#7EA9D1) to evoke trustworthiness and reliability.
- Background color: Light gray (#F0F2F5), for a clean and neutral backdrop.
- Accent color: Soft Lavender (#BCA4D7), to add a subtle touch of sophistication and call attention to key UI elements.
- Body text: 'Inter' (sans-serif), for a modern, objective, neutral feel. Headlines: 'Space Grotesk' (sans-serif) for a computerized, techy feel.
- Code snippets: 'Source Code Pro' (monospace), to maintain readability and differentiate from the rest of the text.
- Icons: lucide-angular icons with a consistent line weight and style.
- Layout: Use Tailwind CSS grid and utility classes (rounded, shadow, px, gap) for spacing and sizing, aligning with shadcn/ui.