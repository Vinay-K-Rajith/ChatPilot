import LeadTable from '../LeadTable';

export default function LeadTableExample() {
  const mockLeads = [
    {
      _id: "1",
      name: "Sarah Johnson",
      phone: "+1 234 567 8900",
      email: "sarah.j@example.com",
      status: "qualified" as const,
      engagementScore: 85,
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      _id: "2",
      name: "Mike Chen",
      phone: "+1 234 567 8901",
      status: "contacted" as const,
      engagementScore: 62,
      lastContactedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      _id: "3",
      name: "Emma Davis",
      phone: "+1 234 567 8902",
      email: "emma.d@example.com",
      status: "new" as const,
      engagementScore: 30,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  ];

  return (
    <div className="w-full p-4">
      <LeadTable leads={mockLeads} />
    </div>
  );
}
