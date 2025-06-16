import type { LucideIcon } from 'lucide-react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageTitle({ title, subtitle, icon: Icon, actions }: PageTitleProps) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 mr-2 sm:mr-3 text-primary" />} {/* Responsive icon size */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-semibold text-foreground"> {/* Responsive title size */}
            {title}
          </h1>
        </div>
        {actions && <div className="mt-3 md:mt-0 flex flex-wrap gap-2 items-center">{actions}</div>} {/* Added flex-wrap and gap */}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm md:text-base text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
