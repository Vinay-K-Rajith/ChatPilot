import CampaignCard from "@/components/CampaignCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Campaigns() {
  const campaigns = [
    {
      id: "1",
      name: "Summer Promotion",
      template: "Hi {name}! Check out our exclusive summer deals on industrial metals. Get 15% off on all steel products this month. Reply YES to learn more!",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: "scheduled" as const,
      targetCount: 350,
      sentCount: 0,
    },
    {
      id: "2",
      name: "Product Launch - Aluminum Series",
      template: "Exciting news {name}! We're launching our new aluminum product line. Be the first to know about our revolutionary alloys. Visit our website for details.",
      status: "draft" as const,
      targetCount: 500,
      sentCount: 0,
    },
    {
      id: "3",
      name: "Follow-up Campaign",
      template: "Hi {name}, just following up on our previous conversation. Are you still interested in our metal products? Let me know if you have any questions!",
      scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      status: "sent" as const,
      targetCount: 200,
      sentCount: 187,
    },
    {
      id: "4",
      name: "Welcome Series - New Leads",
      template: "Welcome {name}! Thanks for your interest in GMD Industrial Metals. We're here to help you find the perfect metal solutions for your project.",
      status: "active" as const,
      targetCount: 1000,
      sentCount: 645,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1474674556023-efef886fa147?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/93 via-[#4A90BF]/88 to-[#2C5F8D]/93" />
        <div className="relative p-6 text-white flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campaign Scheduler</h1>
            <p className="text-white/80 mt-1">Create and manage promotional campaigns</p>
          </div>
          <Button variant="secondary" data-testid="button-create-campaign">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onEdit={(id) => console.log("Edit campaign:", id)}
            onSend={(id) => console.log("Send campaign:", id)}
          />
        ))}
      </div>
    </div>
  );
}
