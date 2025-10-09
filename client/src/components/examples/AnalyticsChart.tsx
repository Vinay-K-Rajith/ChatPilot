import AnalyticsChart from '../AnalyticsChart';

export default function AnalyticsChartExample() {
  const lineData = [
    { name: 'Mon', value: 45 },
    { name: 'Tue', value: 52 },
    { name: 'Wed', value: 61 },
    { name: 'Thu', value: 58 },
    { name: 'Fri', value: 70 },
    { name: 'Sat', value: 48 },
    { name: 'Sun', value: 42 },
  ];

  return (
    <div className="w-full max-w-2xl">
      <AnalyticsChart
        title="Conversation Volume"
        type="line"
        data={lineData}
      />
    </div>
  );
}
