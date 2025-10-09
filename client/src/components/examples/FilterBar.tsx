import FilterBar from '../FilterBar';

export default function FilterBarExample() {
  const filterOptions = [
    {
      label: "Status",
      key: "status",
      options: [
        { value: "active", label: "Active" },
        { value: "waiting", label: "Waiting" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      label: "Date",
      key: "date",
      options: [
        { value: "today", label: "Today" },
        { value: "week", label: "This Week" },
        { value: "month", label: "This Month" },
      ],
    },
  ];

  return (
    <div className="w-full p-4">
      <FilterBar filterOptions={filterOptions} />
    </div>
  );
}
