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
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1474674556023-efef886fa147?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2C5F8D]/93 via-[#1E3A5F]/88 to-[#4A90BF]/93" />
        <div className="relative p-6 text-white">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-white/80 mt-1">Performance metrics and insights</p>
        </div>
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
