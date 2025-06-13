import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-8 text-center">
      <div className="mb-8 animate-pulse">
        <Building className="h-24 w-24 text-primary" />
      </div>
      <h1 className="text-5xl md:text-6xl font-headline font-bold text-foreground mb-6">
        Welcome to <span className="text-primary">SiteWise Reports</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
        Streamlining civil engineering field data collection, reporting, and validation with precision and efficiency.
      </p>
      <div className="space-x-4">
        <Button asChild size="lg" className="rounded-xl">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-xl">
          <Link href="/reports/create">Create New Report</Link>
        </Button>
      </div>
      <p className="mt-12 text-sm text-muted-foreground">
        Ensuring quality and compliance, one report at a time.
      </p>
    </div>
  );
}
