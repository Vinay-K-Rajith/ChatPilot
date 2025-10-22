import ChatWindow from '../ChatWindow';

export default function ChatWindowExample() {
  const mockMessages = [
    {
      id: "1",
      content: "Hi! I'm interested in your products.",
      sender: "user" as const,
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      id: "2",
      content: "Hello! Thanks for reaching out. I'd be happy to help you learn more about our industrial metal products. What specific items are you interested in?",
      sender: "ai" as const,
      timestamp: new Date(Date.now() - 1000 * 60 * 9),
    },
    {
      id: "3",
      content: "I need steel sheets for a construction project.",
      sender: "user" as const,
      timestamp: new Date(Date.now() - 1000 * 60 * 8),
    },
  ];

  return (
    <div className="w-full max-w-2xl h-[600px]">
      <ChatWindow phoneNumber="+1234567890" />
    </div>
  );
}
