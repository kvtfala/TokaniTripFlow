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

// Comprehensive global airport database for demo
// Future: Replace with Amadeus API for production
const mockLocations: Location[] = [
  // Fiji
  { code: "NAN", city: "Nadi", country: "Fiji" },
  { code: "SUV", city: "Suva", country: "Fiji" },
  
  // Pacific Islands
  { code: "APW", city: "Apia", country: "Samoa" },
  { code: "TBU", city: "Nuku'alofa", country: "Tonga" },
  { code: "VLI", city: "Port Vila", country: "Vanuatu" },
  { code: "POM", city: "Port Moresby", country: "Papua New Guinea" },
  { code: "NOU", city: "Noumea", country: "New Caledonia" },
  { code: "PPT", city: "Papeete", country: "French Polynesia" },
  { code: "RAR", city: "Rarotonga", country: "Cook Islands" },
  { code: "HNL", city: "Honolulu", country: "United States" },
  { code: "GUM", city: "Guam", country: "Guam" },
  { code: "HIR", city: "Honiara", country: "Solomon Islands" },
  
  // New Zealand
  { code: "AKL", city: "Auckland", country: "New Zealand" },
  { code: "WLG", city: "Wellington", country: "New Zealand" },
  { code: "CHC", city: "Christchurch", country: "New Zealand" },
  { code: "ZQN", city: "Queenstown", country: "New Zealand" },
  { code: "DUD", city: "Dunedin", country: "New Zealand" },
  { code: "NSN", city: "Nelson", country: "New Zealand" },
  
  // Australia
  { code: "SYD", city: "Sydney", country: "Australia" },
  { code: "MEL", city: "Melbourne", country: "Australia" },
  { code: "BNE", city: "Brisbane", country: "Australia" },
  { code: "PER", city: "Perth", country: "Australia" },
  { code: "ADL", city: "Adelaide", country: "Australia" },
  { code: "CBR", city: "Canberra", country: "Australia" },
  { code: "DRW", city: "Darwin", country: "Australia" },
  { code: "HBA", city: "Hobart", country: "Australia" },
  { code: "CNS", city: "Cairns", country: "Australia" },
  { code: "OOL", city: "Gold Coast", country: "Australia" },
  
  // Southeast Asia
  { code: "SIN", city: "Singapore", country: "Singapore" },
  { code: "BKK", city: "Bangkok", country: "Thailand" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia" },
  { code: "CGK", city: "Jakarta", country: "Indonesia" },
  { code: "DPS", city: "Denpasar (Bali)", country: "Indonesia" },
  { code: "MNL", city: "Manila", country: "Philippines" },
  { code: "HAN", city: "Hanoi", country: "Vietnam" },
  { code: "SGN", city: "Ho Chi Minh City", country: "Vietnam" },
  { code: "RGN", city: "Yangon", country: "Myanmar" },
  { code: "PNH", city: "Phnom Penh", country: "Cambodia" },
  
  // East Asia
  { code: "HKG", city: "Hong Kong", country: "Hong Kong" },
  { code: "NRT", city: "Tokyo (Narita)", country: "Japan" },
  { code: "HND", city: "Tokyo (Haneda)", country: "Japan" },
  { code: "KIX", city: "Osaka", country: "Japan" },
  { code: "ICN", city: "Seoul", country: "South Korea" },
  { code: "PEK", city: "Beijing", country: "China" },
  { code: "PVG", city: "Shanghai", country: "China" },
  { code: "CAN", city: "Guangzhou", country: "China" },
  { code: "TPE", city: "Taipei", country: "Taiwan" },
  
  // South Asia & Middle East
  { code: "DEL", city: "Delhi", country: "India" },
  { code: "BOM", city: "Mumbai", country: "India" },
  { code: "BLR", city: "Bangalore", country: "India" },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates" },
  { code: "DOH", city: "Doha", country: "Qatar" },
  { code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates" },
  { code: "BAH", city: "Manama", country: "Bahrain" },
  
  // Europe
  { code: "LHR", city: "London (Heathrow)", country: "United Kingdom" },
  { code: "LGW", city: "London (Gatwick)", country: "United Kingdom" },
  { code: "CDG", city: "Paris", country: "France" },
  { code: "FRA", city: "Frankfurt", country: "Germany" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands" },
  { code: "MAD", city: "Madrid", country: "Spain" },
  { code: "BCN", city: "Barcelona", country: "Spain" },
  { code: "FCO", city: "Rome", country: "Italy" },
  { code: "MXP", city: "Milan", country: "Italy" },
  { code: "VIE", city: "Vienna", country: "Austria" },
  { code: "ZRH", city: "Zurich", country: "Switzerland" },
  { code: "CPH", city: "Copenhagen", country: "Denmark" },
  { code: "ARN", city: "Stockholm", country: "Sweden" },
  { code: "OSL", city: "Oslo", country: "Norway" },
  { code: "HEL", city: "Helsinki", country: "Finland" },
  { code: "DUB", city: "Dublin", country: "Ireland" },
  { code: "BRU", city: "Brussels", country: "Belgium" },
  { code: "MUC", city: "Munich", country: "Germany" },
  
  // North America - United States
  { code: "JFK", city: "New York (JFK)", country: "United States" },
  { code: "EWR", city: "Newark", country: "United States" },
  { code: "LAX", city: "Los Angeles", country: "United States" },
  { code: "SFO", city: "San Francisco", country: "United States" },
  { code: "ORD", city: "Chicago", country: "United States" },
  { code: "DFW", city: "Dallas", country: "United States" },
  { code: "ATL", city: "Atlanta", country: "United States" },
  { code: "MIA", city: "Miami", country: "United States" },
  { code: "SEA", city: "Seattle", country: "United States" },
  { code: "LAS", city: "Las Vegas", country: "United States" },
  { code: "DEN", city: "Denver", country: "United States" },
  { code: "BOS", city: "Boston", country: "United States" },
  { code: "IAD", city: "Washington DC", country: "United States" },
  { code: "PHX", city: "Phoenix", country: "United States" },
  { code: "SAN", city: "San Diego", country: "United States" },
  
  // North America - Canada
  { code: "YYZ", city: "Toronto", country: "Canada" },
  { code: "YVR", city: "Vancouver", country: "Canada" },
  { code: "YUL", city: "Montreal", country: "Canada" },
  { code: "YYC", city: "Calgary", country: "Canada" },
  
  // Central & South America
  { code: "MEX", city: "Mexico City", country: "Mexico" },
  { code: "GRU", city: "São Paulo", country: "Brazil" },
  { code: "GIG", city: "Rio de Janeiro", country: "Brazil" },
  { code: "EZE", city: "Buenos Aires", country: "Argentina" },
  { code: "SCL", city: "Santiago", country: "Chile" },
  { code: "LIM", city: "Lima", country: "Peru" },
  { code: "BOG", city: "Bogotá", country: "Colombia" },
  { code: "PTY", city: "Panama City", country: "Panama" },
  
  // Africa
  { code: "JNB", city: "Johannesburg", country: "South Africa" },
  { code: "CPT", city: "Cape Town", country: "South Africa" },
  { code: "CAI", city: "Cairo", country: "Egypt" },
  { code: "NBO", city: "Nairobi", country: "Kenya" },
  { code: "ADD", city: "Addis Ababa", country: "Ethiopia" },
  { code: "LOS", city: "Lagos", country: "Nigeria" },
  { code: "ACC", city: "Accra", country: "Ghana" },
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
