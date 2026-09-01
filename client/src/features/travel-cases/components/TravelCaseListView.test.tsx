import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TravelCaseListView } from "./TravelCaseListView";

const baseProps = {
  cases: [],
  query: "",
  onQueryChange: vi.fn(),
  onOpenCase: vi.fn(),
  onCreateCase: vi.fn(),
  onRetry: vi.fn(),
};

describe("TravelCaseListView", () => {
  it("exposes a labelled search and a useful empty state", () => {
    const html = renderToStaticMarkup(<TravelCaseListView {...baseProps} />);

    expect(html).toContain('aria-label="Search travel cases"');
    expect(html).toContain("No travel cases yet");
    expect(html).toContain("Create travel case");
  });

  it("announces loading and error states", () => {
    const loading = renderToStaticMarkup(<TravelCaseListView {...baseProps} isLoading />);
    const failed = renderToStaticMarkup(<TravelCaseListView {...baseProps} error={new Error("offline")} />);

    expect(loading).toContain('role="status"');
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("No data has been changed");
  });

  it("renders and searches an incomplete draft without a traveller or destination", () => {
    const incompleteDraft = {
      id: "case-1",
      referenceNumber: "DRAFT-0001",
      title: "Regional planning workshop",
      status: "draft" as const,
      priority: "normal" as const,
      travellerDisplayName: null,
      destinationDisplayName: null,
      startDate: null,
      endDate: null,
      currentDependency: null,
      nextAction: "Complete case details",
      version: 0,
      updatedAt: "2026-09-01T10:31:25.000Z",
    };

    const html = renderToStaticMarkup(
      <TravelCaseListView {...baseProps} cases={[incompleteDraft]} query="regional" />,
    );

    expect(html).toContain("Traveller pending");
    expect(html).toContain("Destination pending");
    expect(html).toContain("Regional planning workshop");
  });
});
