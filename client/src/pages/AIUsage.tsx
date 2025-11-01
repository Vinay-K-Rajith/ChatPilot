import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { BarChart3, Bot, Coins } from 'lucide-react';
import { safeFetch } from '@/utils/api';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface UsageResponse {
  success: boolean;
  range: { start_date: string; end_date: string };
  totals: { requests: number; tokens: number; input_tokens: number; output_tokens: number; cost_usd: number };
  daily: Array<{ date: string; requests: number; tokens: number; input_tokens: number; output_tokens: number; cost_usd: number }>;
}

export default function AIUsage() {
  const { data, isLoading, error } = useQuery<UsageResponse>({
    queryKey: ['ai-usage', 'last-month'],
    queryFn: () => safeFetch('/api/ai/usage'),
  });

  const dailyData = data?.daily || [];

  const niceNumber = (n?: number) =>
    typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#2C5F8D]/90 to-[#4A90BF]/95" />
        <div className="relative p-6 text-white flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Usage</h1>
            <p className="text-white/80 mt-1">OpenAI usage for last month{data?.range ? ` (${data.range.start_date} → ${data.range.end_date})` : ''}</p>
          </div>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-destructive">Failed to load usage. {String((error as any)?.message || '')}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Requests" value={niceNumber(data?.totals?.requests)} icon={BarChart3} />
        <StatCard title="Total Tokens" value={niceNumber(data?.totals?.tokens)} icon={Bot} />
        <StatCard title="Est. Cost (USD)" value={typeof data?.totals?.cost_usd === 'number' ? `$${niceNumber(data?.totals?.cost_usd)}` : '-'} icon={Coins} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Tokens</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => niceNumber(Number(value))} />
              <Line type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="input_tokens" stroke="#10b981" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="output_tokens" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}