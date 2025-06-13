import { PageTitle } from '@/components/common/PageTitle';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreateReportPage() {
  return (
    <>
      <PageTitle 
        title="Create New Field Report" 
        icon={FileText}
        subtitle="Fill in the details below to submit a new field report."
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
              Cancel
            </Link>
          </Button>
        }
      />
      <div className="bg-card p-6 rounded-lg shadow-md">
        <p className="text-muted-foreground">Report form will be displayed here. (Coming Soon)</p>
        {/* Placeholder for ReportFormComponent */}
      </div>
    </>
  );
}
