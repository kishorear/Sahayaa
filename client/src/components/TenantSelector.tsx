import React, { useEffect, useState } from 'react';
import { Building } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface Tenant {
  id: number;
  name: string;
}

export interface TenantSelectorProps {
  onTenantChange: (tenantId: number | undefined) => void;
  selectedTenantId?: number;
  className?: string;
  showAllOption?: boolean;
  label?: string;
}

export default function TenantSelector({ 
  onTenantChange, 
  selectedTenantId, 
  className = "", 
  showAllOption = true,
  label = "Tenant Filter"
}: TenantSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  // Only creator role users should have access to this component
  const isCreator = user?.role?.toLowerCase() === 'creator';
  
  // Fetch tenants
  const { data: tenantsData, isLoading, error } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
    enabled: isCreator
  });
  
  // Handle errors separately
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to load tenants",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  // Update tenants when data is available
  useEffect(() => {
    if (tenantsData) {
      setTenants(tenantsData);
    }
  }, [tenantsData]);
  
  // Don't render the component for non-creator users
  if (!isCreator) return null;
  
  return (
    <div className={className}>
      <Label htmlFor="tenant-selector" className="text-sm font-medium text-gray-700 mb-1 block">
        {label}
      </Label>
      <Select
        value={selectedTenantId?.toString() || "all"}
        onValueChange={(value) => {
          const tenantId = value === "all" ? undefined : parseInt(value, 10);
          onTenantChange(tenantId);
        }}
        disabled={isLoading}
      >
        <SelectTrigger id="tenant-selector" className="w-full">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <SelectValue placeholder="Select tenant" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">All Tenants</SelectItem>
          )}
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id.toString()}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}