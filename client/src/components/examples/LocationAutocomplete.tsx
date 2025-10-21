import { useState } from "react";
import { LocationAutocomplete } from "../LocationAutocomplete";
import { type Location } from "@shared/types";

export default function LocationAutocompleteExample() {
  const [selected, setSelected] = useState<Location | null>(null);

  return (
    <div className="p-8 max-w-md">
      <LocationAutocomplete value={selected} onSelect={setSelected} />
      {selected && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">Selected:</p>
          <p className="text-sm text-muted-foreground">
            {selected.code} - {selected.city}, {selected.country}
          </p>
        </div>
      )}
    </div>
  );
}
