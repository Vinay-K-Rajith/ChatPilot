import { useState } from "react";
import { useChatHistory } from "@/hooks/useChatHistory";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";
import FilterBar from "@/components/FilterBar";

interface ConversationsProps {}

export default function Conversations({}: ConversationsProps) {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>();
  const { updateChatMetadata } = useChatHistory();

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
  ];

  const handleFilter = async (values: Record<string, string[]>) => {
    if (selectedPhoneNumber && values.status?.[0]) {
      await updateChatMetadata(selectedPhoneNumber, {
        labels: values.status
      });
    }
  };


  return (
    <div className="h-full flex flex-col">
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1474674556023-efef886fa147?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/95 via-[#2C5F8D]/85 to-[#4A90BF]/90" />
        <div className="relative p-6 text-white">
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-white/80 mt-1">Manage all your WhatsApp conversations</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        <div className="w-96 flex flex-col gap-4">
          <FilterBar 
            filterOptions={filterOptions} 
            onFilter={handleFilter}
          />
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              selectedId={selectedPhoneNumber}
              onSelect={setSelectedPhoneNumber}
            />
          </div>
        </div>

        <div className="flex-1">
          {selectedPhoneNumber ? (
            <ChatWindow phoneNumber={selectedPhoneNumber} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
