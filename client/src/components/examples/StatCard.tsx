import StatCard from '../StatCard';
import { Users } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="w-80">
      <StatCard
        title="Total Leads"
        value="2,543"
        icon={Users}
        trend={{ value: 12.5, isPositive: true }}
        description="Active leads in pipeline"
      />
    </div>
  );
}
