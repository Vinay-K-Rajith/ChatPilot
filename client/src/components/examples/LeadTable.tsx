import LeadTable from '../LeadTable';

export default function LeadTableExample() {
  const mockLeads = [
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
  ];

  return (
    <div className="w-full p-4">
      <LeadTable leads={mockLeads} />
    </div>
  );
}
