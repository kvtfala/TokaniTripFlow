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
});
