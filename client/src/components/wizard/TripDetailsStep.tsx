import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { Plus, X, Plane } from "lucide-react";
import type { WizardFormData, TripSector, TripType } from "@shared/types";

interface TripDetailsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function TripDetailsStep({ formData, updateFormData }: TripDetailsStepProps) {
  const handleTripTypeChange = (value: TripType) => {
    updateFormData({ 
      tripType: value,
      sectors: value === "multi-city" ? [{ id: "sector-1", origin: formData.origin, destination: "", date: formData.departureDate }] : []
    });
  };

  const addSector = () => {
    const lastSector = formData.sectors?.[formData.sectors.length - 1];
    const newSector: TripSector = {
      id: `sector-${Date.now()}`,
      origin: lastSector?.destination || "",
      destination: "",
      date: "",
    };
    updateFormData({ sectors: [...(formData.sectors || []), newSector] });
  };

  const updateSector = (id: string, field: keyof TripSector, value: string) => {
    updateFormData({
      sectors: formData.sectors?.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    });
  };

  const removeSector = (id: string) => {
    updateFormData({
      sectors: formData.sectors?.filter((s) => s.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Trip Type */}
      <div className="space-y-3">
        <Label>Trip Type *</Label>
        <RadioGroup value={formData.tripType} onValueChange={handleTripTypeChange} data-testid="radio-trip-type">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="one-way" id="one-way" data-testid="radio-one-way" />
            <Label htmlFor="one-way" className="font-normal cursor-pointer">
              One-way
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="return" id="return" data-testid="radio-return" />
            <Label htmlFor="return" className="font-normal cursor-pointer">
              Return / Round trip
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multi-city" id="multi-city" data-testid="radio-multi-city" />
            <Label htmlFor="multi-city" className="font-normal cursor-pointer">
              Multi-city
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Simple route (One-way or Return) */}
      {formData.tripType !== "multi-city" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="origin">Origin *</Label>
            <Input
              id="origin"
              value={formData.origin}
              onChange={(e) => updateFormData({ origin: e.target.value })}
              placeholder="e.g., Nadi (NAN)"
              data-testid="input-origin"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination *</Label>
            <LocationAutocomplete
              value={formData.destination}
              onSelect={(location) => updateFormData({ destination: location })}
              placeholder="Search city or airport code..."
            />
          </div>
        </div>
      )}

      {/* Date fields for simple routes */}
      {formData.tripType !== "multi-city" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="departure-date">Departure Date *</Label>
            <Input
              id="departure-date"
              type="date"
              value={formData.departureDate}
              onChange={(e) => updateFormData({ departureDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              data-testid="input-departure-date"
            />
          </div>
          {formData.tripType === "return" && (
            <div className="space-y-2">
              <Label htmlFor="return-date">Return Date *</Label>
              <Input
                id="return-date"
                type="date"
                value={formData.returnDate}
                onChange={(e) => updateFormData({ returnDate: e.target.value })}
                min={formData.departureDate || new Date().toISOString().split('T')[0]}
                data-testid="input-return-date"
              />
            </div>
          )}
        </div>
      )}

      {/* Multi-city sectors */}
      {formData.tripType === "multi-city" && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Flight Sectors</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSector}
              data-testid="button-add-sector"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Sector
            </Button>
          </div>

          {formData.sectors?.map((sector, index) => (
            <div key={sector.id} className="p-4 border rounded-md space-y-3" data-testid={`sector-${index}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Plane className="w-4 h-4" />
                  Sector {index + 1}
                </div>
                {formData.sectors && formData.sectors.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSector(sector.id)}
                    data-testid={`button-remove-sector-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input
                    value={sector.origin}
                    onChange={(e) => updateSector(sector.id, "origin", e.target.value)}
                    placeholder="Origin"
                    data-testid={`input-sector-${index}-origin`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    value={sector.destination}
                    onChange={(e) => updateSector(sector.id, "destination", e.target.value)}
                    placeholder="Destination"
                    data-testid={`input-sector-${index}-destination`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={sector.date}
                    onChange={(e) => updateSector(sector.id, "date", e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid={`input-sector-${index}-date`}
                  />
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Date flexibility */}
      <div className="flex items-center justify-between p-4 border rounded-md">
        <div className="space-y-0.5">
          <Label htmlFor="dates-flexible">Are dates flexible?</Label>
          <p className="text-sm text-muted-foreground">
            Allow flexibility for better fares
          </p>
        </div>
        <Switch
          id="dates-flexible"
          checked={formData.datesFlexible}
          onCheckedChange={(checked) => 
            updateFormData({ 
              datesFlexible: checked,
              flexibilityDays: checked ? 2 : undefined
            })
          }
          data-testid="switch-dates-flexible"
        />
      </div>

      {formData.datesFlexible && (
        <div className="space-y-2">
          <Label htmlFor="flexibility-days">Flexibility (±days)</Label>
          <Input
            id="flexibility-days"
            type="number"
            min="1"
            max="7"
            value={formData.flexibilityDays || 2}
            onChange={(e) => updateFormData({ flexibilityDays: parseInt(e.target.value) || 2 })}
            data-testid="input-flexibility-days"
          />
        </div>
      )}

      {/* Special notes */}
      <div className="space-y-2">
        <Label htmlFor="special-notes">Special Travel Notes (Optional)</Label>
        <Textarea
          id="special-notes"
          placeholder="e.g., Medical requirements, seating preferences, wheelchair assistance..."
          value={formData.specialNotes}
          onChange={(e) => updateFormData({ specialNotes: e.target.value })}
          rows={3}
          className="resize-none"
          data-testid="textarea-special-notes"
        />
        <p className="text-xs text-muted-foreground">
          Include any special requirements or accessibility needs
        </p>
      </div>
    </div>
  );
}
