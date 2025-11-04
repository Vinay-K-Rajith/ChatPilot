import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import FilterBar from "@/components/FilterBar";
import LeadTable from "@/components/LeadTable";
import PreviewChat from "@/components/PreviewChat";
import LeadForm from "@/components/LeadForm";
import ExcelImport from "@/components/ExcelImport";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Upload, Trash, Loader2, BarChart3 } from "lucide-react";
import { useLeads, useLeadOperations } from "@/hooks/useLeads";
import type { LeadWithId, CreateLead, LeadFilters, PaginationOptions } from "../../../shared/models/lead";

export default function Leads() {
  const [isPreviewChatOpen, setIsPreviewChatOpen] = useState(false);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithId | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [calculatingEngagement, setCalculatingEngagement] = useState(false);
  
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Fetch leads data
  const { data: leadsResponse, isLoading, error } = useLeads(filters, pagination);
  
  // Lead operations
  const { createLead, updateLead, deleteLead, bulkDeleteLeads } = useLeadOperations();

  const filterOptions = [
    {
      label: "Status",
      key: "status",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "converted", label: "Converted" },
        { value: "lost", label: "Lost" },
      ],
    },
    {
      label: "Engagement",
      key: "engagement",
      options: [
        { value: "high", label: "High (80-100%)" },
        { value: "medium", label: "Medium (50-79%)" },
        { value: "low", label: "Low (0-49%)" },
      ],
    },
  ];

  const leads = leadsResponse?.leads || [];
  const totalLeads = leadsResponse?.total || 0;
  
  // Handle form submissions
  const handleCreateLead = async (data: CreateLead) => {
    try {
      await createLead.mutateAsync(data);
      toast({ title: "Success", description: "Lead created successfully!" });
      setIsLeadFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create lead", variant: "destructive" });
    }
  };

  const handleUpdateLead = async (data: CreateLead) => {
    if (!editingLead?._id) return;
    
    try {
      await updateLead.mutateAsync({ 
        id: editingLead._id, 
        data 
      });
      toast({ title: "Success", description: "Lead updated successfully!" });
      setEditingLead(null);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update lead", variant: "destructive" });
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    
    try {
      await deleteLead.mutateAsync(id);
      toast({ title: "Success", description: "Lead deleted successfully!" });
      setSelectedLeads(prev => prev.filter(selectedId => selectedId !== id));
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete lead", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)?`)) return;
    
    try {
      await bulkDeleteLeads.mutateAsync(selectedLeads);
      toast({ title: "Success", description: `${selectedLeads.length} lead(s) deleted successfully!` });
      setSelectedLeads([]);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete leads", variant: "destructive" });
    }
  };

  // Handle selection
  const handleSelectLead = (id: string, selected: boolean) => {
    setSelectedLeads(prev => 
      selected 
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedLeads(selected ? leads.map(lead => lead._id || '') : []);
  };

  const handleContactLead = (leadId: string) => {
    // Find the lead by ID to get the phone number
    const lead = leads.find(l => l._id === leadId);
    if (lead && lead.phone) {
      // Navigate to Conversations page with the phone number as a query parameter
      navigate(`/conversations?phone=${encodeURIComponent(lead.phone)}`);
    } else {
      toast({ title: "Error", description: "Lead phone number not found", variant: "destructive" });
    }
  };

  const handleCalculateEngagement = async () => {
    if (calculatingEngagement) return;
    
    setCalculatingEngagement(true);
    try {
      const response = await fetch('/api/leads/calculate-all-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({ 
          title: "Success", 
          description: `Calculated engagement for ${result.results.updated} leads. Skipped: ${result.results.skipped}, Errors: ${result.results.errors}` 
        });
        // Refresh leads after calculation
        window.location.reload();
      } else {
        throw new Error('Failed to calculate engagement scores');
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to calculate engagement scores", 
        variant: "destructive" 
      });
    } finally {
      setCalculatingEngagement(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1474674556023-efef886fa147?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2C5F8D]/95 via-[#1E3A5F]/90 to-[#4A90BF]/95" />
        <div className="relative p-6 text-white flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads Management</h1>
            <p className="text-white/80 mt-1">Track and manage your lead pipeline</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedLeads.length > 0 && (
              <Button
                variant="outline"
                className="bg-red-100/20 border-red-300/20 text-red-100 hover:bg-red-200/20"
                onClick={handleBulkDelete}
                disabled={bulkDeleteLeads.isPending}
                data-testid="button-bulk-delete"
              >
                {bulkDeleteLeads.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4 mr-2" />
                )}
                Delete {selectedLeads.length}
              </Button>
            )}
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setIsPreviewChatOpen(true)}
              data-testid="button-preview-chat"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Preview Chat
            </Button>
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={handleCalculateEngagement}
              disabled={calculatingEngagement}
              data-testid="button-calculate-engagement"
            >
              {calculatingEngagement ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Calculate Scores
            </Button>
            <Button 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setIsImportOpen(true)}
              data-testid="button-import-excel"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setIsLeadFormOpen(true)}
              data-testid="button-add-lead"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>
      </div>

      <FilterBar 
        filterOptions={filterOptions} 
        onFiltersChange={setFilters}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load leads"}
          </AlertDescription>
        </Alert>
      )}

      <LeadTable
        leads={leads}
        selectedLeads={selectedLeads}
        onSelectLead={handleSelectLead}
        onSelectAll={handleSelectAll}
        onContactLead={handleContactLead}
        onEditLead={setEditingLead}
        onDeleteLead={handleDeleteLead}
        isLoading={isLoading}
      />

      <PreviewChat 
        isOpen={isPreviewChatOpen} 
        onClose={() => setIsPreviewChatOpen(false)} 
      />
      
      <LeadForm
        open={isLeadFormOpen || !!editingLead}
        onClose={() => {
          setIsLeadFormOpen(false);
          setEditingLead(null);
        }}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
        initialData={editingLead || undefined}
        isLoading={createLead.isPending || updateLead.isPending}
        error={createLead.error?.message || updateLead.error?.message}
      />
      
      <ExcelImport
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={(result) => {
          toast({ 
            title: "Import Complete", 
            description: `${result.success} leads imported successfully!` 
          });
        }}
      />
    </div>
  );
}
