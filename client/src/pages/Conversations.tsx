import { useState } from "react";
import FilterBar from "@/components/FilterBar";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState<string>("1");

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

  const conversations = [
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

  const messages = [
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
    {
      id: "4",
      content: "Great! We have a wide range of steel sheets available. Our premium grade sheets are perfect for construction. They come in various thicknesses and sizes. Would you like me to send you our product catalog?",
      sender: "ai" as const,
      timestamp: new Date(Date.now() - 1000 * 60 * 7),
    },
    {
      id: "5",
      content: "Yes, I'm interested in the premium package",
      sender: "user" as const,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-header p-6 text-white">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-white/80 mt-1">Manage all your WhatsApp conversations</p>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        <div className="w-96 flex flex-col gap-4">
          <FilterBar filterOptions={filterOptions} />
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
            />
          </div>
        </div>

        <div className="flex-1">
          <ChatWindow
            messages={messages}
            leadName="Sarah Johnson"
            onSendMessage={(msg) => console.log("Send message:", msg)}
          />
        </div>
      </div>
    </div>
  );
}
