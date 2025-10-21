import { VisaCheckPanel } from "../VisaCheckPanel";

export default function VisaCheckPanelExample() {
  return (
    <div className="p-8 max-w-2xl space-y-4">
      <VisaCheckPanel
        result={{
          status: "OK",
          message: "No visa required for this destination.",
        }}
      />
      <VisaCheckPanel
        result={{
          status: "WARNING",
          message: "Visa may be required. Please verify with your travel coordinator.",
          policyLink: "#",
        }}
      />
      <VisaCheckPanel
        result={{
          status: "ACTION",
          message: "Visa required for Australia. Processing time: 2-4 weeks.",
          policyLink: "#",
        }}
      />
    </div>
  );
}
