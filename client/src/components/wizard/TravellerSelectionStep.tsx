import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, Users, User, Briefcase, Building2 } from "lucide-react";
import type { WizardFormData, Traveller } from "@shared/types";

interface TravellerSelectionStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function TravellerSelectionStep({ formData, updateFormData }: TravellerSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: directory = [], isLoading: dirLoading } = useQuery<Traveller[]>({
    queryKey: ["/api/users"],
  });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return directory.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.employeeNumber.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.position.toLowerCase().includes(q),
    );
  }, [searchQuery, directory]);

  const recentTravellers = directory.slice(0, 3);

  const addTraveller = (traveller: Traveller) => {
    if (formData.travellers.some(t => t.id === traveller.id)) return;

    const updatedTravellers = [...formData.travellers, traveller];
    const updates: Partial<WizardFormData> = {
      travellers: updatedTravellers,
      isGroupRequest: updatedTravellers.length > 1,
    };
    if (updatedTravellers.length === 1 && traveller.managerId) {
      updates.primaryApproverId = traveller.managerId;
    }
    updateFormData(updates);
    setSearchQuery("");
    setPopoverOpen(false);
  };

  const removeTraveller = (travellerId: string) => {
    const updatedTravellers = formData.travellers.filter(t => t.id !== travellerId);
    updateFormData({ travellers: updatedTravellers, isGroupRequest: updatedTravellers.length > 1 });
  };

  const commonDepartment =
    formData.travellers.length > 0 &&
    formData.travellers.every(t => t.department === formData.travellers[0].department)
      ? formData.travellers[0].department
      : "Multiple";

  const commonManager =
    formData.travellers.length > 0 &&
    formData.travellers.every(t => t.manager === formData.travellers[0].manager)
      ? formData.travellers[0].manager
      : "Multiple";

  return (
    <div className="space-y-6">
      {/* Traveller search */}
      <div className="space-y-2">
        <Label htmlFor="traveller-search">Select Traveller(s) *</Label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-start text-left font-normal"
              data-testid="button-add-traveller"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add traveller...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search by name, position or department..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                data-testid="input-search-traveller"
              />
              <CommandList>
                {dirLoading && (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                )}
                <CommandEmpty>No travellers found.</CommandEmpty>

                {!searchQuery && recentTravellers.length > 0 && (
                  <CommandGroup heading="Staff Directory">
                    {recentTravellers.map(traveller => (
                      <CommandItem
                        key={traveller.id}
                        onSelect={() => addTraveller(traveller)}
                        data-testid={`traveller-recent-${traveller.id}`}
                      >
                        <User className="w-4 h-4 mr-2 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{traveller.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {traveller.position} · {traveller.department}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchQuery && searchResults.length > 0 && (
                  <CommandGroup heading="Search Results">
                    {searchResults.map(traveller => (
                      <CommandItem
                        key={traveller.id}
                        onSelect={() => addTraveller(traveller)}
                        data-testid={`traveller-result-${traveller.id}`}
                      >
                        <User className="w-4 h-4 mr-2 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{traveller.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {traveller.employeeNumber} · {traveller.position} · {traveller.department}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected travellers */}
      {formData.travellers.length > 0 && (
        <Card className="p-4 bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Selected Travellers ({formData.travellers.length})
              </Label>
              {formData.isGroupRequest && (
                <Badge variant="outline" className="bg-primary/10">
                  <Users className="w-3 h-3 mr-1" />
                  Group Request
                </Badge>
              )}
            </div>

            {formData.travellers.map(traveller => (
              <div
                key={traveller.id}
                className="flex items-start justify-between gap-3 p-3 rounded-md bg-background border"
                data-testid={`selected-traveller-${traveller.id}`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{traveller.name}</span>
                    <span className="text-xs text-muted-foreground">{traveller.employeeNumber}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-6">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {traveller.position}
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {traveller.department}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTraveller(traveller.id)}
                  data-testid={`button-remove-traveller-${traveller.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Auto-filled fields */}
      {formData.travellers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              value={commonDepartment}
              readOnly
              className="bg-muted"
              data-testid="input-department"
            />
          </div>
          <div className="space-y-2">
            <Label>Manager</Label>
            <Input
              value={commonManager}
              readOnly
              className="bg-muted"
              data-testid="input-manager"
            />
            <p className="text-xs text-muted-foreground">Will be set as primary approver</p>
          </div>
        </div>
      )}

      {/* Purpose field */}
      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose of Travel *</Label>
        <Textarea
          id="purpose"
          placeholder="e.g., Attend annual conference, Client meeting, Training workshop..."
          value={formData.purpose}
          onChange={e => updateFormData({ purpose: e.target.value })}
          rows={3}
          className="resize-none"
          data-testid="textarea-purpose"
        />
        <p className="text-xs text-muted-foreground">
          Minimum 10 characters · {formData.purpose.length}/500
        </p>
      </div>
    </div>
  );
}
