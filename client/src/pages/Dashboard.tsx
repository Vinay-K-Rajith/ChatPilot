import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import AnalyticsChart from "@/components/AnalyticsChart";
import ConversationList from "@/components/ConversationList";
import ApprovedTemplates from "@/components/ApprovedTemplates";
import { Users, MessageSquare, TrendingUp, Target } from "lucide-react";
import { safeFetch } from "@/utils/api";

type LeadsResponse = { total: number } & Record<string, any>;

type CampaignStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalSent: number;
};

type ChatHistory = { lastInteraction?: string | Date };

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Dashboard() {
  const [totals, setTotals] = useState({
    totalLeads: 0,
    convertedLeads: 0,
    activeConversations: 0,
    campaignStats: { totalCampaigns: 0, activeCampaigns: 0, completedCampaigns: 0, totalSent: 0 } as CampaignStats,
  });

  const [conversationData, setConversationData] = useState<Array<{ name: string; value: number }>>(
    Array.from({ length: 7 }).map((_, i) => ({ name: dayLabels[(new Date().getDay() - (6 - i) + 7) % 7], value: 0 }))
  );

  const [conversionData, setConversionData] = useState<Array<{ name: string; value: number }>>([
    { name: "New", value: 0 },
    { name: "Contacted", value: 0 },
    { name: "Qualified", value: 0 },
    { name: "Converted", value: 0 },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [allLeads, converted, newL, contacted, qualified, chats, campStats] = await Promise.all([
          safeFetch<LeadsResponse>(`/api/leads?limit=1`),
          safeFetch<LeadsResponse>(`/api/leads?status=converted&limit=1`),
          safeFetch<LeadsResponse>(`/api/leads?status=new&limit=1`),
          safeFetch<LeadsResponse>(`/api/leads?status=contacted&limit=1`),
          safeFetch<LeadsResponse>(`/api/leads?status=qualified&limit=1`),
          fetch(`/api/chat-history?limit=1000`).then(r => r.json() as Promise<ChatHistory[]>),
          safeFetch<CampaignStats>(`/api/campaigns-stats`),
        ]);

        if (cancelled) return;

        // Active conversations: last interaction within 24h
        const now = new Date();
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const activeConversations = (chats || []).filter(c => {
          const d = c?.lastInteraction ? new Date(c.lastInteraction) : undefined;
          return d && d >= cutoff;
        }).length;

        // Conversation volume last 7 days
        const counts = new Array(7).fill(0);
        (chats || []).forEach(c => {
          const d = c?.lastInteraction ? new Date(c.lastInteraction) : undefined;
          if (!d) return;
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
          if (diffDays >= 0 && diffDays < 7) {
            counts[6 - diffDays] += 1; // align to last 7 days timeline
          }
        });
        const convData = counts.map((val, idx) => {
          const dayIdx = (now.getDay() - (6 - idx) + 7) % 7;
          return { name: dayLabels[dayIdx], value: val };
        });

        // Conversion funnel from lead counts by status
        const funnel = [
          { name: "New", value: newL.total || 0 },
          { name: "Contacted", value: contacted.total || 0 },
          { name: "Qualified", value: qualified.total || 0 },
          { name: "Converted", value: converted.total || 0 },
        ];

        setTotals({
          totalLeads: allLeads.total || 0,
          convertedLeads: converted.total || 0,
          activeConversations,
          campaignStats: campStats,
        });
        setConversationData(convData);
        setConversionData(funnel);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      }
    }

    loadData();
    const id = setInterval(loadData, 60_000); // refresh every minute
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const conversionRate = useMemo(() => {
    if (!totals.totalLeads) return 0;
    return Math.round((totals.convertedLeads / totals.totalLeads) * 100);
  }, [totals.totalLeads, totals.convertedLeads]);

  const campaignPerformance = useMemo(() => {
    const t = totals.campaignStats.totalCampaigns || 0;
    if (!t) return 0;
    return Math.round(((totals.campaignStats.completedCampaigns || 0) / t) * 100);
  }, [totals.campaignStats]);

  const stats = [
    {
      title: "Total Leads",
      value: totals.totalLeads.toLocaleString(),
      icon: Users,
      description: "Active leads in pipeline",
    },
    {
      title: "Active Conversations",
      value: totals.activeConversations,
      icon: MessageSquare,
      description: "Last 24h",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      description: "Lead to customer",
    },
    {
      title: "Campaign Performance",
      value: `${campaignPerformance}%`,
      icon: Target,
      description: "Completed / Total",
    },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1474674556023-efef886fa147?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#2C5F8D]/90 to-[#4A90BF]/95" />
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
          <ConversationList limit={3} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-card border border-card-border">
              <div className="text-sm text-muted-foreground">Total Campaigns</div>
              <div className="text-2xl font-bold mt-1">{totals.campaignStats.totalCampaigns}</div>
              <div className="text-xs text-muted-foreground mt-1">Sent: {totals.campaignStats.totalSent}</div>
            </div>
            <div className="p-4 rounded-lg bg-card border border-card-border">
              <div className="text-sm text-muted-foreground">Active Campaigns</div>
              <div className="text-2xl font-bold mt-1">{totals.campaignStats.activeCampaigns}</div>
              <div className="text-xs text-muted-foreground mt-1">Completed: {totals.campaignStats.completedCampaigns}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Approved WhatsApp Templates</h2>
        {/* Click any item to view full template */}
        {/** Component renders a modal on item click **/}
        <ApprovedTemplates limit={10} />
      </div>
    </div>
  );
}
