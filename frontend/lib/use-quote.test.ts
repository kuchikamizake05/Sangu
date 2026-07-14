import { act, renderHook } from "@testing-library/react";
import { getQuote, type Quote } from "./api";
import { useQuote } from "./use-quote";

vi.mock("./api", () => ({ getQuote: vi.fn() }));

function sampleQuote(amountIdr: string): Quote {
  return {
    rate: "3500",
    amountIdr,
    estimate: true,
    rateSource: "demo",
    rateAsOf: "2026-07-13T09:00:00.000Z",
    feeIdrEstimate: "12000",
    comparison: { westernUnionFeeIdrEstimate: "35000", note: "" },
  };
}

describe("useQuote", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getQuote).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fetch while the amount is empty, zero, or invalid", () => {
    const { result, rerender } = renderHook(({ amount }) => useQuote("MY", amount), { initialProps: { amount: "" } });
    expect(getQuote).not.toHaveBeenCalled();
    expect(result.current).toEqual({ quote: null, loading: false, error: null });

    rerender({ amount: "0" });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(getQuote).not.toHaveBeenCalled();

    rerender({ amount: "abc" });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(getQuote).not.toHaveBeenCalled();
  });

  it("debounces ~400ms before fetching a quote for a valid amount", async () => {
    vi.mocked(getQuote).mockResolvedValue(sampleQuote("1750000"));
    const { result } = renderHook(() => useQuote("MY", "500"));

    expect(result.current.loading).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(399); });
    expect(getQuote).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(getQuote).toHaveBeenCalledWith("MY", "500");
    expect(result.current.quote).toEqual(sampleQuote("1750000"));
    expect(result.current.loading).toBe(false);
  });

  it("ignores a stale response that resolves after the amount has changed again", async () => {
    let resolveStale: ((quote: Quote) => void) | undefined;
    vi.mocked(getQuote).mockImplementation((_corridor, amount) => {
      if (amount === "500") return new Promise((resolve) => { resolveStale = resolve; });
      return Promise.resolve(sampleQuote("999999"));
    });

    const { result, rerender } = renderHook(({ amount }) => useQuote("MY", amount), { initialProps: { amount: "500" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(getQuote).toHaveBeenCalledWith("MY", "500");

    rerender({ amount: "600" });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(result.current.quote).toEqual(sampleQuote("999999"));

    // Respons request lama ("500") baru selesai sekarang — harus diabaikan, bukan menimpa quote terbaru.
    await act(async () => { resolveStale?.(sampleQuote("111111")); });
    expect(result.current.quote).toEqual(sampleQuote("999999"));
  });

  it("surfaces a friendly error message when the quote request fails", async () => {
    vi.mocked(getQuote).mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useQuote("HK", "500"));

    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(result.current.error).toBe("Kurs belum dapat dimuat. Coba lagi.");
    expect(result.current.loading).toBe(false);
    expect(result.current.quote).toBeNull();
  });
});
