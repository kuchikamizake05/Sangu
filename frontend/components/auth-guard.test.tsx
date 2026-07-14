import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "@/lib/api";
import { getToken } from "@/lib/auth-session";
import { AuthGuard } from "./auth-guard";

vi.mock("@/lib/api", () => ({ getMe: vi.fn() }));
vi.mock("@/lib/auth-session", () => ({ getToken: vi.fn() }));

describe("AuthGuard", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", { value: { pathname: "/app", search: "?tab=home", assign: vi.fn() }, writable: true });
  });

  it("redirects a visitor without a session before rendering sender content", async () => {
    vi.mocked(getToken).mockReturnValue(null);

    render(<AuthGuard><p>Pengirim</p></AuthGuard>);

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/login?next=%2Fapp%3Ftab%3Dhome"));
    expect(screen.queryByText("Pengirim")).not.toBeInTheDocument();
  });

  it("renders a session holder and tolerates a background profile refresh failure", async () => {
    vi.mocked(getToken).mockReturnValue("session");
    vi.mocked(getMe).mockRejectedValue(new Error("offline"));

    render(<AuthGuard><p>Pengirim</p></AuthGuard>);

    expect(await screen.findByText("Pengirim")).toBeInTheDocument();
    await waitFor(() => expect(getMe).toHaveBeenCalledOnce());
  });
});
