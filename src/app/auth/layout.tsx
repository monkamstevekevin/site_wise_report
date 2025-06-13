
import { Building } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <Link href="/" className="mb-8 flex items-center text-primary hover:opacity-80 transition-opacity">
        <Building className="h-8 w-8 mr-2" />
        <h1 className="text-2xl font-headline font-bold">SiteWise Reports</h1>
      </Link>
      {children}
    </div>
  );
}
