import { TravelRequestForm } from "../TravelRequestForm";

export default function TravelRequestFormExample() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <TravelRequestForm
        onSubmit={(data) => {
          console.log("Form submitted:", data);
          alert("Request submitted successfully!");
        }}
      />
    </div>
  );
}
