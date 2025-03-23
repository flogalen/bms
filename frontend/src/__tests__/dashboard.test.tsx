import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import DashboardPage from "../app/dashboard/page";

// Mock the next/navigation
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
    };
  },
}));

test("Dashboard renders correctly", () => {
  render(<DashboardPage />);
  
  // Check if Dashboard title is present
  const dashboardTitle = screen.getByText("Dashboard");
  expect(dashboardTitle).toBeDefined();
  
  // Check if some cards are present
  const tasksTitle = screen.getByText("Tasks");
  expect(tasksTitle).toBeDefined();
  
  const teamMembersTitle = screen.getByText("Team Members");
  expect(teamMembersTitle).toBeDefined();
  
  const customersTitle = screen.getByText("Customers");
  expect(customersTitle).toBeDefined();
});

