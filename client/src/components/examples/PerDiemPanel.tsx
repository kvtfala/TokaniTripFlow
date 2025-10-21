import { PerDiemPanel } from "../PerDiemPanel";

export default function PerDiemPanelExample() {
  const mockCalculation = {
    totalFJD: 325,
    days: 4,
    mieFJD: 100,
    firstDayFJD: 75,
    middleDaysFJD: 200,
    lastDayFJD: 50,
  };

  return (
    <div className="p-8 max-w-md space-y-4">
      <PerDiemPanel calculation={null} loading={false} />
      <PerDiemPanel calculation={null} loading={true} />
      <PerDiemPanel calculation={mockCalculation} loading={false} />
    </div>
  );
}
