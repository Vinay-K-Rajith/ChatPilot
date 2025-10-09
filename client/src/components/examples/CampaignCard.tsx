import CampaignCard from '../CampaignCard';

export default function CampaignCardExample() {
  const mockCampaign = {
    id: "1",
    name: "Summer Promotion",
    template: "Hi {name}! 🌞 Check out our exclusive summer deals on industrial metals. Get 15% off on all steel products this month. Reply YES to learn more!",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    status: "scheduled" as const,
    targetCount: 350,
    sentCount: 0,
  };

  return (
    <div className="w-96">
      <CampaignCard campaign={mockCampaign} />
    </div>
  );
}
