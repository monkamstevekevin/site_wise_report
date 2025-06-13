import { PageTitle } from '@/components/common/PageTitle';
import { HardHat, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectManagementPage() {
  return (
    <>
      <PageTitle 
        title="Project Management" 
        icon={HardHat}
        subtitle="Manage all construction projects and their details."
        actions={
          <Button className="rounded-lg">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
          </Button>
        }
      />
      <div className="bg-card p-6 rounded-lg shadow-md">
        <p className="text-muted-foreground">Project list and management tools will be here. (Coming Soon)</p>
        {/* Placeholder for ProjectTableComponent and ProjectFormDialog */}
      </div>
    </>
  );
}
