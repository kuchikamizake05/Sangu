import { clearAuthToken, getAuthToken, saveAuthToken } from "./auth-session";

describe("auth session", () => {
  it("persists and clears the sender session token", () => {
    saveAuthToken("sender-session");
    expect(getAuthToken()).toBe("sender-session");
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });
});
