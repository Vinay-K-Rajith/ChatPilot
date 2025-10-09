import AnalyticsChart from "@/components/AnalyticsChart";
import StatCard from "@/components/StatCard";
import { TrendingUp, Users, MessageSquare, Target } from "lucide-react";

export default function Analytics() {
  const kpiData = [
    {
      title: "Response Rate",
      value: "87.3%",
      icon: MessageSquare,
      trend: { value: 5.2, isPositive: true },
      description: "AI response accuracy",
    },
    {
      title: "Lead Conversion",
      value: "24.3%",
      icon: TrendingUp,
      trend: { value: 3.1, isPositive: true },
      description: "Overall conversion rate",
    },
    {
      title: "Engagement Score",
      value: "72/100",
      icon: Users,
      trend: { value: 8.5, isPositive: true },
      description: "Average lead engagement",
    },
    {
      title: "Campaign Success",
      value: "89%",
      icon: Target,
      trend: { value: -2.1, isPositive: false },
      description: "Campaign completion rate",
    },
  ];

  const conversionFunnelData = [
    { name: 'New Leads', value: 1200 },
    { name: 'Contacted', value: 950 },
    { name: 'Qualified', value: 620 },
    { name: 'Proposal Sent', value: 380 },
    { name: 'Converted', value: 292 },
  ];

  const responseTimeData = [
    { name: 'Mon', value: 2.5 },
    { name: 'Tue', value: 2.1 },
    { name: 'Wed', value: 1.9 },
    { name: 'Thu', value: 2.3 },
    { name: 'Fri', value: 2.0 },
    { name: 'Sat', value: 2.8 },
    { name: 'Sun', value: 3.2 },
  ];

  const channelData = [
    { name: 'WhatsApp', value: 65 },
    { name: 'Direct', value: 20 },
    { name: 'Referral', value: 10 },
    { name: 'Website', value: 5 },
  ];

  const weeklyConversations = [
    { name: 'Week 1', value: 245 },
    { name: 'Week 2', value: 312 },
    { name: 'Week 3', value: 289 },
    { name: 'Week 4', value: 356 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-header rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-white/80 mt-1">Performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Conversion Funnel"
          type="bar"
          data={conversionFunnelData}
        />
        <AnalyticsChart
          title="Average Response Time (minutes)"
          type="line"
          data={responseTimeData}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Lead Source Distribution"
          type="pie"
          data={channelData}
        />
        <AnalyticsChart
          title="Weekly Conversations"
          type="bar"
          data={weeklyConversations}
        />
      </div>
    </div>
  );
}
