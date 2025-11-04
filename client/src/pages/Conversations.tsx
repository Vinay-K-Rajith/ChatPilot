import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useChatHistory } from "@/hooks/useChatHistory";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";
import FilterBar from "@/components/FilterBar";

interface ConversationsProps {}

export default function Conversations({}: ConversationsProps) {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>();
  const [pathname] = useLocation();
  const { updateChatMetadata } = useChatHistory();

  // Handle navigation from Leads page via query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const phone = params.get('phone');
      if (phone) {
        setSelectedPhoneNumber(phone);
      }
    }
  }, [pathname]);

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
    <div className="h-screen flex flex-col">
      <header className="shrink-0 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Conversations</h1>
          <p className="text-sm text-muted-foreground">Manage all your WhatsApp conversations</p>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[24rem_1fr] gap-6 p-6 overflow-hidden">
        <aside className="min-h-0 flex flex-col gap-4">
          <FilterBar 
            filterOptions={filterOptions} 
            onFilter={handleFilter}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConversationList
              selectedId={selectedPhoneNumber}
              onSelect={setSelectedPhoneNumber}
            />
          </div>
        </aside>

        <section className="min-h-0 flex">
          {selectedPhoneNumber ? (
            <div className="flex-1 min-h-0"><ChatWindow phoneNumber={selectedPhoneNumber} /></div>
          ) : (
            <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
