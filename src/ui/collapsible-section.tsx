// components/CollapsibleSection.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function CollapsibleSection({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="mb-4 shadow-sm border border-gray-200">
      <CardHeader
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center space-x-2"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
