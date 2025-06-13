import { PageTitle } from '@/components/common/PageTitle';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  return (
    <>
      <PageTitle 
        title="Field Reports" 
        icon={FileText}
        subtitle="Manage and review all submitted field reports."
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Report
            </Link>
          </Button>
        }
      />
      <div className="bg-card p-6 rounded-lg shadow-md">
        <p className="text-muted-foreground">Reports table will be displayed here. (Coming Soon)</p>
        {/* Placeholder for ReportsTableComponent */}
      </div>
    </>
  );
}
