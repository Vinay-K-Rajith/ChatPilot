import { useState } from "react";
import FilterBar from "@/components/FilterBar";
import LeadTable from "@/components/LeadTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Leads() {
  const filterOptions = [
    {
      label: "Status",
      key: "status",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "converted", label: "Converted" },
        { value: "lost", label: "Lost" },
      ],
    },
    {
      label: "Engagement",
      key: "engagement",
      options: [
        { value: "high", label: "High (80-100%)" },
        { value: "medium", label: "Medium (50-79%)" },
        { value: "low", label: "Low (0-49%)" },
      ],
    },
  ];

  const leads = [
    {
      id: "1",
      name: "Sarah Johnson",
      phone: "+1 234 567 8900",
      email: "sarah.j@example.com",
      status: "qualified" as const,
      engagementScore: 85,
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      id: "2",
      name: "Mike Chen",
      phone: "+1 234 567 8901",
      status: "contacted" as const,
      engagementScore: 62,
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: "3",
      name: "Emma Davis",
      phone: "+1 234 567 8902",
      email: "emma.d@example.com",
      status: "new" as const,
      engagementScore: 30,
    },
    {
      id: "4",
      name: "James Wilson",
      phone: "+1 234 567 8903",
      email: "j.wilson@example.com",
      status: "converted" as const,
      engagementScore: 95,
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      id: "5",
      name: "Lisa Anderson",
      phone: "+1 234 567 8904",
      status: "lost" as const,
      engagementScore: 15,
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-header rounded-lg p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads Management</h1>
          <p className="text-white/80 mt-1">Track and manage your lead pipeline</p>
        </div>
        <Button variant="secondary" data-testid="button-add-lead">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <FilterBar filterOptions={filterOptions} />

      <LeadTable
        leads={leads}
        onContactLead={(id) => console.log("Contact lead:", id)}
      />
    </div>
  );
}
