import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface FilterBarProps {
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, string[]>) => void;
  onFiltersChange?: (filters: any) => void;
  filterOptions: {
    label: string;
    key: string;
    options: { value: string; label: string }[];
  }[];
}

export default function FilterBar({ onSearch, onFilter, onFiltersChange, filterOptions }: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
    
    // Also update the filters for new API
    if (onFiltersChange) {
      const filters: any = { search: value || undefined };
      
      // Add active filters
      Object.entries(activeFilters).forEach(([key, values]) => {
        if (key === 'status' && values.length > 0) {
          filters.status = values;
        } else if (key === 'engagement' && values.length > 0) {
          const engagementValue = values[0];
          if (engagementValue === 'high') {
            filters.engagementScore = { min: 80, max: 100 };
          } else if (engagementValue === 'medium') {
            filters.engagementScore = { min: 50, max: 79 };
          } else if (engagementValue === 'low') {
            filters.engagementScore = { min: 0, max: 49 };
          }
        }
      });
      
      onFiltersChange(filters);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: [value] };
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
    
    // Also update the filters for new API
    if (onFiltersChange) {
      const filters: any = { search: searchQuery || undefined };
      
      // Add new filters
      Object.entries(newFilters).forEach(([filterKey, values]) => {
        if (filterKey === 'status' && values.length > 0) {
          filters.status = values;
        } else if (filterKey === 'engagement' && values.length > 0) {
          const engagementValue = values[0];
          if (engagementValue === 'high') {
            filters.engagementScore = { min: 80, max: 100 };
          } else if (engagementValue === 'medium') {
            filters.engagementScore = { min: 50, max: 79 };
          } else if (engagementValue === 'low') {
            filters.engagementScore = { min: 0, max: 49 };
          }
        }
      });
      
      onFiltersChange(filters);
    }
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
    
    // Also update the filters for new API
    if (onFiltersChange) {
      const filters: any = { search: searchQuery || undefined };
      
      // Add remaining filters
      Object.entries(newFilters).forEach(([filterKey, values]) => {
        if (filterKey === 'status' && values.length > 0) {
          filters.status = values;
        } else if (filterKey === 'engagement' && values.length > 0) {
          const engagementValue = values[0];
          if (engagementValue === 'high') {
            filters.engagementScore = { min: 80, max: 100 };
          } else if (engagementValue === 'medium') {
            filters.engagementScore = { min: 50, max: 79 };
          } else if (engagementValue === 'low') {
            filters.engagementScore = { min: 0, max: 49 };
          }
        }
      });
      
      onFiltersChange(filters);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        {filterOptions.map((filter) => (
          <Select
            key={filter.key}
            onValueChange={(value) => handleFilterChange(filter.key, value)}
            value={activeFilters[filter.key]?.[0] || ""}
          >
            <SelectTrigger className="w-40" data-testid={`select-${filter.key}`}>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder={filter.label} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {Object.entries(activeFilters).map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1">
              {value}
              <button
                onClick={() => removeFilter(key)}
                className="ml-1 hover:text-destructive"
                data-testid={`button-remove-filter-${key}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
