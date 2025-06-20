"use client"

import * as React from "react"
import { format, isValid, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar" // Renamed to avoid conflict
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface CustomCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  name?: string;
  placeholder?: string;
  className?: string;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  className,
  selected,
  onSelect,
  name,
  placeholder = "Selecione uma data",
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(selected || new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  const formatSelectedDate = selected ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          {formatSelectedDate || placeholder}
          <CalendarIcon className="ml-auto h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex flex-col p-3">
          <div className="flex items-center justify-between pb-4">
            <Button
              variant="ghost"
              onClick={() => setMonth(subMonths(month, 1))}
              className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button
              variant="ghost"
              onClick={() => setMonth(addMonths(month, 1))}
              className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((day, index) => (
              <div key={index} className="w-8">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-sm">
            {days.map((day, index) => (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  "h-8 w-8 p-0",
                  isSameMonth(day, month) ? "opacity-100" : "opacity-50",
                  isSameDay(day, selected || new Date()) && "bg-primary text-primary-foreground",
                  !isSameMonth(day, month) && "text-muted-foreground"
                )}
                onClick={() => {
                  onSelect(day);
                  setOpen(false);
                }}
              >
                {format(day, "d")}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

CustomCalendar.displayName = "CustomCalendar";

export { CustomCalendar }; 