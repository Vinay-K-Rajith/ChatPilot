import ConversationList from '../ConversationList';

export default function ConversationListExample() {
  const mockConversations = [
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
    <div className="w-96 p-4">
      <ConversationList />
    </div>
  );
}
