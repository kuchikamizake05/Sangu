import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";
import { RateSection } from "./rate-section";
import { Reveal } from "./reveal";

describe("Reveal", () => {
  const originalObserver = globalThis.IntersectionObserver;

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: originalObserver,
    });
  });

  it("shows its contents without IntersectionObserver support", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(<Reveal>Konten Sangu</Reveal>);

    await waitFor(() => expect(screen.getByText("Konten Sangu").className).toContain("revealVisible"));
  });

  it("reveals content when the observed section enters the viewport", async () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    class MockIntersectionObserver {
      constructor(nextCallback: IntersectionObserverCallback) { callback = nextCallback; }
      observe = vi.fn();
      disconnect = disconnect;
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<Reveal>Konten terlihat</Reveal>);
    callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    await waitFor(() => expect(screen.getByText("Konten terlihat").className).toContain("revealVisible"));
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("Hero", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("offers clear entry points to account creation and rate information", () => {
    render(<Hero />);

    expect(screen.getByRole("link", { name: "Buka akun gratis" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Lihat kursnya" })).toHaveAttribute("href", "#kurs");
    expect(screen.getByText(/Sangu pulang untuk/i)).toBeInTheDocument();
  });
});

describe("HeroStrip", () => {
  const CARD_COUNT = 8;
  const RENDERED_CARDS = 32; // CARDS.length * REPEAT
  const STEP_MS = 3400;

  // Index kartu lebar dibaca dari transform track — satu-satunya state loop yang terlihat di DOM.
  function stripIndex(container: HTMLElement): number {
    const track = container.querySelector<HTMLElement>("[style*='--strip-step']");
    const match = track?.style.transform.match(/\((\d+) \* var\(--strip-step\)\)/);
    if (!match) throw new Error(`transform track tidak terbaca: ${track?.style.transform}`);
    return Number(match[1]);
  }

  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps looping past the end of the card list instead of scrolling into empty space", () => {
    const { container } = render(<Hero />);
    const wideCards = new Set<number>();

    // Cukup untuk melewati beberapa kali titik lompat balik (reset tiap 8 langkah).
    for (let step = 0; step < 30; step += 1) {
      act(() => { vi.advanceTimersByTime(STEP_MS); });
      const index = stripIndex(container);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(RENDERED_CARDS);
      wideCards.add(index % CARD_COUNT);
    }

    // Tiap kartu tetap dapat giliran jadi kartu lebar — loop berjalan, bukan mentok di satu posisi.
    expect(wideCards.size).toBe(CARD_COUNT);
  });

  it("holds the jump back until the transition finished so the loop stays invisible", () => {
    const { container } = render(<Hero />);

    // Maju sampai tepat di titik reset (index 24 = CARDS.length * (REPEAT - 1)).
    for (let step = 0; step < 16; step += 1) act(() => { vi.advanceTimersByTime(STEP_MS); });
    expect(stripIndex(container)).toBe(24);

    // Selama transisi 1.2s berjalan, track belum boleh melompat.
    act(() => { vi.advanceTimersByTime(1000); });
    expect(stripIndex(container)).toBe(24);

    // Setelah transisi selesai, lompat balik satu copy ke posisi yang identik secara visual.
    act(() => { vi.advanceTimersByTime(400); });
    expect(stripIndex(container)).toBe(16);
  });
});

describe("RateSection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rates: { IDR: 4000 } }),
    }));
    vi.stubGlobal("IntersectionObserver", undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lets a sender select a corridor and calculates the received amount", async () => {
    render(<RateSection />);

    await waitFor(() => expect(screen.getByText(/1 USD .*4\.000 IDR/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Mata uang asal" }));
    fireEvent.click(screen.getByRole("option", { name: /HKD/i }));

    const amount = screen.getByRole("textbox", { name: /Jumlah dalam Dolar Hong Kong/i });
    fireEvent.change(amount, { target: { value: "12abc,5" } });

    await waitFor(() => expect(screen.getByText(/1 HKD .*4\.000 IDR/)).toBeInTheDocument());
    expect(amount).toHaveValue("12,5");
    expect(screen.getByText("50.000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bandingkan dengan kurs Google" })).toHaveAttribute("href", expect.stringContaining("HKD+to+IDR"));
  });

  it("offers USD as a source currency and calculates its rate", async () => {
    render(<RateSection />);

    fireEvent.click(screen.getByRole("button", { name: "Mata uang asal" }));
    fireEvent.click(screen.getByRole("option", { name: /USD/i }));

    await waitFor(() => expect(screen.getByText(/1 USD .*4\.000 IDR/)).toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: /Jumlah dalam Dolar AS/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bandingkan dengan kurs Google" })).toHaveAttribute("href", expect.stringContaining("USD+to+IDR"));
  });

  it("offers JPY as a source currency and calculates its rate", async () => {
    render(<RateSection />);

    fireEvent.click(screen.getByRole("button", { name: "Mata uang asal" }));
    fireEvent.click(screen.getByRole("option", { name: /JPY/i }));

    await waitFor(() => expect(screen.getByText(/1 JPY .*4\.000 IDR/)).toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: /Jumlah dalam Yen Jepang/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bandingkan dengan kurs Google" })).toHaveAttribute("href", expect.stringContaining("JPY+to+IDR"));
  });

  it("closes the currency menu when Escape is pressed", () => {
    render(<RateSection />);

    fireEvent.click(screen.getByRole("button", { name: "Mata uang asal" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
