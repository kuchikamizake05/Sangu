import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

beforeEach(() => window.localStorage.setItem("sangu.sender-token", "test-session"));
