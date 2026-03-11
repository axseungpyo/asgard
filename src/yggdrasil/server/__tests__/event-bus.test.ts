import { describe, expect, it, vi } from "vitest";
import { InProcessEventBus } from "../adapters/events/InProcessEventBus";

describe("InProcessEventBus", () => {
  it("continues notifying other subscribers when one throws", () => {
    const eventBus = new InProcessEventBus();
    const handled = vi.fn();

    eventBus.subscribe("test.event", () => {
      throw new Error("boom");
    });
    eventBus.subscribe("test.event", handled);

    expect(() => {
      eventBus.publish({
        type: "test.event",
        timestamp: Date.now(),
        payload: { ok: true },
      });
    }).not.toThrow();

    expect(handled).toHaveBeenCalledTimes(1);
  });

  it("supports subscribeAll listeners", () => {
    const eventBus = new InProcessEventBus();
    const handled = vi.fn();

    eventBus.subscribeAll(handled);
    eventBus.publish({
      type: "test.event",
      timestamp: Date.now(),
      payload: { value: 1 },
    });

    expect(handled).toHaveBeenCalledTimes(1);
    expect(handled.mock.calls[0][0]).toMatchObject({
      type: "test.event",
      payload: { value: 1 },
    });
  });
});
