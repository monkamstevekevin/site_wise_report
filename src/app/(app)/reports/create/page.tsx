
import { PageTitle } from '@/components/common/PageTitle';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReportForm } from './components/ReportForm';

export default function CreateReportPage() {
  return (
    <>
      <PageTitle 
        title="Create New Field Report" 
        icon={FileText}
        subtitle="Fill in the details below to submit a new field report and get AI-powered anomaly detection."
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
              Cancel
            </Link>
          </Button>
        }
      />
      <ReportForm />
    </>
  );
}
