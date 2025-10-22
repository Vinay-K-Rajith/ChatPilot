import CampaignCard from "@/components/CampaignCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { useCampaigns, useCampaignOperations } from "@/hooks/useCampaigns";
import { useState } from "react";
import type { CampaignFilters, Campaign } from "../../../shared/models/campaign";
import CampaignFormModal from "@/components/CampaignFormModal";

export default function Campaigns() {
  const [filters, setFilters] = useState<CampaignFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  // Update filters when search or filter values change
  const currentFilters: CampaignFilters = {
    ...filters,
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : [statusFilter as any],
    type: typeFilter === "all" ? undefined : [typeFilter as any],
  };
  
  const { data: campaignData, isLoading, error } = useCampaigns(currentFilters, {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc"
  });
  
  const campaignOperations = useCampaignOperations();
  
  const campaigns = campaignData?.campaigns || [];

  const handleCampaignAction = async (action: string, campaignId: string) => {
    try {
      switch (action) {
        case "edit":
          const campaignToEdit = campaigns.find(c => c._id === campaignId);
          if (campaignToEdit) {
            setEditingCampaign(campaignToEdit);
            setCampaignModalOpen(true);
          }
          break;
        case "pause":
          await campaignOperations.pause(campaignId);
          break;
        case "resume":
          await campaignOperations.resume(campaignId);
          break;
        case "send":
          await campaignOperations.sendNow(campaignId);
          break;
        case "delete":
          if (confirm("Are you sure you want to delete this campaign?")) {
            await campaignOperations.delete(campaignId);
          }
          break;
      }
    } catch (error) {
      console.error("Campaign action failed:", error);
      // TODO: Show toast notification
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignModalOpen(true);
  };

  const handleCloseModal = () => {
    setCampaignModalOpen(false);
    setEditingCampaign(null);
  };

  const handleCampaignSuccess = (campaign: Campaign) => {
    // The campaign list will be automatically refreshed via React Query
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1474674556023-efef886fa147?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/93 via-[#4A90BF]/88 to-[#2C5F8D]/93" />
        <div className="relative p-6 text-white flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Campaign Scheduler</h1>
            <p className="text-white/80 mt-1">Create and manage promotional campaigns</p>
            {campaignData && (
              <div className="flex gap-4 mt-2">
                <Badge variant="secondary" className="bg-white/20">
                  {campaignData.total} total
                </Badge>
                <Badge variant="secondary" className="bg-white/20">
                  {campaigns.filter(c => c.status === 'active').length} active
                </Badge>
              </div>
            )}
          </div>
          <Button 
            variant="secondary" 
            onClick={handleCreateCampaign}
            data-testid="button-create-campaign"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="broadcast">Broadcast</SelectItem>
            <SelectItem value="drip">Drip</SelectItem>
            <SelectItem value="trigger">Trigger</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading campaigns...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <p>Error loading campaigns: {error.message}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto max-w-sm">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No campaigns found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all" 
                ? "No campaigns match your current filters." 
                : "Get started by creating your first campaign."}
            </p>
            <Button 
              className="mt-4" 
              onClick={handleCreateCampaign}
              data-testid="button-create-campaign"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign._id}
              campaign={{
                id: campaign._id || '',
                name: campaign.name,
                template: campaign.template,
                scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : undefined,
                status: campaign.status as any,
                targetCount: campaign.targetCount,
                sentCount: campaign.sentCount,
              }}
              onEdit={(id) => handleCampaignAction("edit", id)}
              onSend={(id) => handleCampaignAction("send", id)}
              onPause={(id) => handleCampaignAction("pause", id)}
              onResume={(id) => handleCampaignAction("resume", id)}
              onDelete={(id) => handleCampaignAction("delete", id)}
              isLoading={campaignOperations.isLoading}
            />
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {campaignData && campaignData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Badge variant="outline">
            Page {campaignData.page} of {campaignData.totalPages}
          </Badge>
          {/* TODO: Add pagination controls */}
        </div>
      )}

      {/* Campaign Form Modal */}
      <CampaignFormModal
        open={campaignModalOpen}
        onClose={handleCloseModal}
        campaign={editingCampaign}
        onSuccess={handleCampaignSuccess}
      />
    </div>
  );
}
