import StatCard from "@/components/StatCard";
import AnalyticsChart from "@/components/AnalyticsChart";
import ConversationList from "@/components/ConversationList";
import { Users, MessageSquare, TrendingUp, Target } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Leads",
      value: "2,543",
      icon: Users,
      trend: { value: 12.5, isPositive: true },
      description: "Active leads in pipeline",
    },
    {
      title: "Active Conversations",
      value: "847",
      icon: MessageSquare,
      trend: { value: 8.2, isPositive: true },
      description: "Ongoing chats",
    },
    {
      title: "Conversion Rate",
      value: "24.3%",
      icon: TrendingUp,
      trend: { value: 3.1, isPositive: true },
      description: "Lead to customer",
    },
    {
      title: "Campaign Performance",
      value: "89%",
      icon: Target,
      trend: { value: -2.4, isPositive: false },
      description: "Average open rate",
    },
  ];

  const conversationData = [
    { name: 'Mon', value: 45 },
    { name: 'Tue', value: 52 },
    { name: 'Wed', value: 61 },
    { name: 'Thu', value: 58 },
    { name: 'Fri', value: 70 },
    { name: 'Sat', value: 48 },
    { name: 'Sun', value: 42 },
  ];

  const conversionData = [
    { name: 'New', value: 1200 },
    { name: 'Contacted', value: 950 },
    { name: 'Qualified', value: 620 },
    { name: 'Converted', value: 292 },
  ];

  const recentConversations = [
    {
      id: "1",
      leadName: "Sarah Johnson",
      lastMessage: "Yes, I'm interested in the premium package",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: "active" as const,
      unread: 2,
    },
    {
      id: "2",
      leadName: "Mike Chen",
      lastMessage: "Can you send me more details?",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: "waiting" as const,
    },
    {
      id: "3",
      leadName: "Emma Davis",
      lastMessage: "Thank you for the information",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: "closed" as const,
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/95 via-[#6366F1]/90 to-[#3B82F6]/95" />
        <div className="relative p-6 text-white">
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-white/80 mt-1">Monitor your WhatsApp AI CRM performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Conversation Volume (Last 7 Days)"
          type="line"
          data={conversationData}
        />
        <AnalyticsChart
          title="Conversion Funnel"
          type="bar"
          data={conversionData}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <ConversationList conversations={recentConversations} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-card border border-card-border">
              <div className="text-sm text-muted-foreground">Response Time</div>
              <div className="text-2xl font-bold mt-1">2.3 min</div>
              <div className="text-xs text-chart-3 mt-1">-15% faster</div>
            </div>
            <div className="p-4 rounded-lg bg-card border border-card-border">
              <div className="text-sm text-muted-foreground">AI Accuracy</div>
              <div className="text-2xl font-bold mt-1">94.5%</div>
              <div className="text-xs text-chart-3 mt-1">+2.1% improvement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
