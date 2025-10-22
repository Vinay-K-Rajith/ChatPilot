import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Users, 
  CheckCircle2, 
  Circle, 
  Loader2,
  User,
  Mail,
  Phone,
  Filter
} from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import type { LeadWithId, LeadFilters, PaginationOptions } from "../../../shared/models/lead";

interface LeadSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  onSelectionChange: (leadIds: string[]) => void;
  onConfirm: (leads: LeadWithId[]) => void;
}

// Available lead status options for filtering
const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export default function LeadSelector({
  open,
  onClose,
  selectedLeadIds,
  onSelectionChange,
  onConfirm
}: LeadSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [localSelection, setLocalSelection] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [allLoadedLeads, setAllLoadedLeads] = useState<LeadWithId[]>([]);
  
  // Build filters for API call
  const apiFilters: LeadFilters = {
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : [statusFilter as any],
  };
  
  const pagination: PaginationOptions = {
    page,
    limit: 50, // Load more leads per page for better UX
    sortBy: 'name',
    sortOrder: 'asc'
  };
  
  // Fetch leads from API
  const { data: leadsData, isLoading, error } = useLeads(apiFilters, pagination);

  // Initialize local selection when modal opens
  useEffect(() => {
    if (open) {
      setLocalSelection([...selectedLeadIds]);
      setPage(1); // Reset to first page when modal opens
    }
  }, [open, selectedLeadIds]);
  
  // Update all loaded leads when new data comes in
  useEffect(() => {
    if (leadsData?.leads) {
      if (page === 1) {
        // Reset leads for new search/filter
        setAllLoadedLeads(leadsData.leads);
      } else {
        // Append for pagination
        setAllLoadedLeads(prev => {
          const existingIds = new Set(prev.map(lead => lead._id));
          const newLeads = leadsData.leads.filter(lead => !existingIds.has(lead._id));
          return [...prev, ...newLeads];
        });
      }
    }
  }, [leadsData, page]);
  
  // Reset page when search/filter changes
  useEffect(() => {
    setPage(1);
    setAllLoadedLeads([]);
  }, [searchQuery, statusFilter]);
  
  // Current leads to display
  const currentLeads = allLoadedLeads;
  const hasMorePages = leadsData ? page < leadsData.totalPages : false;

  const handleToggleAll = () => {
    const currentLeadIds = currentLeads.map(lead => lead._id);
    const allCurrentSelected = currentLeadIds.every(id => localSelection.includes(id));
    
    if (allCurrentSelected && currentLeadIds.length > 0) {
      // Deselect all current leads
      const remainingSelection = localSelection.filter(
        id => !currentLeadIds.includes(id)
      );
      setLocalSelection(remainingSelection);
    } else {
      // Select all current leads
      const newSelection = [...new Set([
        ...localSelection,
        ...currentLeadIds
      ])];
      setLocalSelection(newSelection);
    }
  };
  
  const handleLoadMore = () => {
    if (hasMorePages && !isLoading) {
      setPage(prev => prev + 1);
    }
  };

  const handleToggleLead = (leadId: string) => {
    if (localSelection.includes(leadId)) {
      setLocalSelection(localSelection.filter(id => id !== leadId));
    } else {
      setLocalSelection([...localSelection, leadId]);
    }
  };

  const handleConfirm = () => {
    // Get selected leads from all loaded leads, not just current page
    const selectedLeads = allLoadedLeads.filter(lead => 
      localSelection.includes(lead._id)
    );
    onSelectionChange(localSelection);
    onConfirm(selectedLeads);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelection([...selectedLeadIds]);
    setSearchQuery("");
    setStatusFilter("all");
    setPage(1);
    setAllLoadedLeads([]);
    onClose();
  };

  const allCurrentSelected = currentLeads.length > 0 && 
    currentLeads.every(lead => localSelection.includes(lead._id));
  const someCurrentSelected = currentLeads.some(lead => 
    localSelection.includes(lead._id));
  const totalCount = leadsData?.total || 0;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Campaign Recipients
          </DialogTitle>
          <DialogDescription>
            Choose which leads will receive this campaign message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, email, or phone..."
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
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
              disabled={currentLeads.length === 0}
            >
              {allCurrentSelected ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <Circle className="h-4 w-4 mr-2" />
              )}
              {allCurrentSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {currentLeads.length} of {totalCount} leads
              {hasMorePages && " (load more available)"}
            </span>
            <Badge variant="outline" className="font-medium">
              {localSelection.length} selected
            </Badge>
          </div>

          <Separator />

          {/* Leads List */}
          {isLoading && page === 1 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading leads...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error loading leads: {error.message}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(1)}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {currentLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {searchQuery || statusFilter !== "all" 
                        ? "No leads found matching your criteria" 
                        : "No leads available"}
                    </p>
                  </div>
                ) : (
                  <>
                    {currentLeads.map((lead) => (
                    <Card 
                      key={lead._id} 
                      className={`cursor-pointer transition-all hover:shadow-sm ${
                        localSelection.includes(lead._id) 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : ""
                      }`}
                      onClick={() => handleToggleLead(lead._id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={localSelection.includes(lead._id)}
                            onChange={() => {}} // Handled by card click
                            className="pointer-events-none"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium truncate">
                                {lead.name}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  lead.status === 'converted' ? 'border-green-200 text-green-700' :
                                  lead.status === 'qualified' ? 'border-blue-200 text-blue-700' :
                                  lead.status === 'contacted' ? 'border-purple-200 text-purple-700' :
                                  lead.status === 'new' ? 'border-yellow-200 text-yellow-700' :
                                  lead.status === 'lost' ? 'border-red-200 text-red-700' :
                                  'border-gray-200 text-gray-700'
                                }`}
                              >
                                {lead.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {lead.email && (
                                <div className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{lead.phone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {lead.engagementScore}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              engagement
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                    
                    {/* Load More Button */}
                    {hasMorePages && (
                      <div className="flex justify-center py-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Load More ({totalCount - currentLeads.length} remaining)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={localSelection.length === 0}
          >
            Confirm Selection ({localSelection.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}