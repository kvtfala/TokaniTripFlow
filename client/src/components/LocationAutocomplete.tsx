import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { type Location } from "@shared/types";

interface LocationAutocompleteProps {
  value: Location | null;
  onSelect: (location: Location) => void;
  placeholder?: string;
}

// todo: remove mock functionality - replace with actual Amadeus API
const mockLocations: Location[] = [
  // Fiji
  { code: "NAN", city: "Nadi", country: "Fiji" },
  { code: "SUV", city: "Suva", country: "Fiji" },
  
  // Pacific
  { code: "AKL", city: "Auckland", country: "New Zealand" },
  { code: "WLG", city: "Wellington", country: "New Zealand" },
  { code: "CHC", city: "Christchurch", country: "New Zealand" },
  { code: "SYD", city: "Sydney", country: "Australia" },
  { code: "MEL", city: "Melbourne", country: "Australia" },
  { code: "BNE", city: "Brisbane", country: "Australia" },
  { code: "PER", city: "Perth", country: "Australia" },
  
  // Asia-Pacific Business Hubs
  { code: "SIN", city: "Singapore", country: "Singapore" },
  { code: "HKG", city: "Hong Kong", country: "Hong Kong" },
  { code: "NRT", city: "Tokyo", country: "Japan" },
  { code: "ICN", city: "Seoul", country: "South Korea" },
  { code: "BKK", city: "Bangkok", country: "Thailand" },
  { code: "MNL", city: "Manila", country: "Philippines" },
  
  // Europe
  { code: "LHR", city: "London", country: "United Kingdom" },
  { code: "CDG", city: "Paris", country: "France" },
  { code: "FRA", city: "Frankfurt", country: "Germany" },
  
  // North America
  { code: "LAX", city: "Los Angeles", country: "United States" },
  { code: "SFO", city: "San Francisco", country: "United States" },
  { code: "YVR", city: "Vancouver", country: "Canada" },
];

export function LocationAutocomplete({ value, onSelect, placeholder = "Select destination..." }: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 font-normal"
          data-testid="button-location-select"
        >
          {value ? (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{value.code}</span>
              <span className="text-muted-foreground">·</span>
              <span>{value.city}, {value.country}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search destinations..." />
          <CommandList>
            <CommandEmpty>No destination found.</CommandEmpty>
            <CommandGroup>
              {mockLocations.map((location) => (
                <CommandItem
                  key={location.code}
                  value={`${location.code} ${location.city} ${location.country}`}
                  onSelect={() => {
                    onSelect(location);
                    setOpen(false);
                  }}
                  data-testid={`option-location-${location.code}`}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${value?.code === location.code ? "opacity-100" : "opacity-0"}`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{location.code}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{location.city}</span>
                    <span className="text-muted-foreground text-sm">({location.country})</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
