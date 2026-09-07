import { describe, expect, it } from "vitest";
import { nextHits, windowDenial, type Tier } from "./aiGate";

const GUEST: Tier = { minIntervalMs: 8000, perMin: 3, perHour: 15, perDay: 30 };
const OWNER: Tier = { minIntervalMs: 1000, perMin: 20, perHour: 200, perDay: 500 };

const NOW = 1_700_000_000_000;
const sAgo = (s: number) => NOW - s * 1000;
const mAgo = (m: number) => NOW - m * 60_000;

describe("windowDenial — Mindestabstand", () => {
  it("blockt einen zweiten Aufruf innerhalb des Mindestabstands", () => {
    const msg = windowDenial([sAgo(3)], NOW, GUEST, false);
    expect(msg).toMatch(/Zu schnell/);
    expect(msg).toMatch(/5 s/); // 8 s Fenster, 3 s vergangen → 5 s warten
  });

  it("lässt durch, sobald der Mindestabstand vorbei ist", () => {
    expect(windowDenial([sAgo(9)], NOW, GUEST, false)).toBeNull();
  });

  it("erster Aufruf überhaupt ist immer erlaubt", () => {
    expect(windowDenial([], NOW, GUEST, false)).toBeNull();
  });
});

describe("windowDenial — Minuten-/Stunden-/Tagesfenster", () => {
  it("greift, wenn perMin erreicht ist (Abstand aber ok)", () => {
    // 3 Treffer in der letzten Minute, alle älter als der Mindestabstand
    const hits = [sAgo(50), sAgo(40), sAgo(30)];
    expect(windowDenial(hits, NOW, GUEST, false)).toMatch(/Zu viele Anfragen/);
  });

  it("zählt nur Treffer im jeweiligen Fenster", () => {
    // 2 in der letzten Minute (< perMin 3), einer davor → erlaubt
    const hits = [mAgo(5), sAgo(45), sAgo(20)];
    // letzter Treffer 20 s her → Mindestabstand (8 s) ok
    expect(windowDenial(hits, NOW, GUEST, false)).toBeNull();
  });

  it("greift beim Stundenlimit", () => {
    // 15 Treffer über die letzte Stunde verteilt, alle > 1 min und > 8 s her
    const hits = Array.from({ length: 15 }, (_, i) => mAgo(2 + i * 3));
    const msg = windowDenial(hits, NOW, GUEST, false);
    expect(msg).toMatch(/Stundenlimit/);
  });

  it("greift beim Tageslimit und nennt für den Owner die Zahl", () => {
    const hits = Array.from({ length: 500 }, (_, i) => NOW - (i + 1) * 100_000); // ~13,9 h Spanne
    const msg = windowDenial(hits, NOW, OWNER, true);
    expect(msg).toMatch(/Tageslimit erreicht \(500\)/);
  });

  it("Owner-Tier lässt deutlich mehr in der Minute zu", () => {
    const hits = Array.from({ length: 10 }, (_, i) => sAgo(10 + i)); // 10 in letzter Minute
    expect(windowDenial(hits, NOW, GUEST, false)).not.toBeNull(); // Gast: blockt (perMin 3)
    expect(windowDenial(hits, NOW, OWNER, true)).toBeNull(); // Owner: ok (perMin 20)
  });
});

describe("nextHits", () => {
  it("hängt now an und wirft Einträge älter als ein Tag raus", () => {
    const old = NOW - 25 * 3_600_000; // 25 h her
    const recent = NOW - 3_600_000; // 1 h her
    const out = nextHits([old, recent], NOW);
    expect(out).toEqual([recent, NOW]);
  });

  it("kappt die Liste bei 400 Einträgen", () => {
    const many = Array.from({ length: 500 }, (_, i) => NOW - i * 1000);
    const out = nextHits(many, NOW);
    expect(out).toHaveLength(400);
    expect(out[out.length - 1]).toBe(NOW); // der neue Treffer bleibt drin
  });
});
