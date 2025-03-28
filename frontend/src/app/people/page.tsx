import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PeopleList } from "@/features/people/components/PeopleList";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "People | Business Management System",
  description: "Manage your contacts and relationships",
};

export default function PeoplePage() {
  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">People</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">Export</Button>
          <Button>Add Person</Button>
        </div>
      </div>
      
      <PeopleList />
    </DashboardShell>
  );
}
