'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIconLucide, Filter as FilterIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface ProjectDateFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function ProjectDateFilter({ dateRange, onDateRangeChange }: ProjectDateFilterProps) {
  const today = new Date();
  const isToday =
    !!dateRange?.from &&
    !!dateRange?.to &&
    isSameDay(dateRange.from, today) &&
    isSameDay(dateRange.to, today);

  const label = dateRange?.from
    ? dateRange.to
      ? isToday
        ? "Aujourd'hui"
        : `${format(dateRange.from, 'dd MMM y', { locale: fr })} - ${format(dateRange.to, 'dd MMM y', { locale: fr })}`
      : isSameDay(dateRange.from, today)
      ? "Aujourd'hui"
      : format(dateRange.from, 'dd MMM y', { locale: fr })
    : null;

  return (
    <Card className="mb-6 shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FilterIcon className="mr-2 h-5 w-5 text-primary" />
          Filtres d&apos;Assignation de Projets
        </CardTitle>
        <CardDescription>
          Sélectionnez une plage de dates pour afficher les projets pertinents.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[300px] justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIconLucide className="mr-2 h-4 w-4" />
              {label ?? <span>Choisir une plage de dates</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          onClick={() =>
            onDateRangeChange({ from: startOfDay(today), to: startOfDay(today) })
          }
          className="w-full sm:w-auto"
          disabled={isToday}
        >
          Aujourd&apos;hui
        </Button>
      </CardContent>
    </Card>
  );
}
