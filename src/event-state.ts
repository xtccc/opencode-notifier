import type { EventState, EventType } from "./types";
import { ALL_EVENT_TYPES } from "./types";
import { log } from "./logger";

const eventStates: Record<EventType, EventState> = {
  permission: { startTime: null, hasEnded: false, timeout: null, data: null },
  complete: { startTime: null, hasEnded: false, timeout: null, data: null },
  subagent_complete: {
    startTime: null,
    hasEnded: false,
    timeout: null,
    data: null,
  },
  error: { startTime: null, hasEnded: false, timeout: null, data: null },
  question: { startTime: null, hasEnded: false, timeout: null, data: null },
};

export function getEventStates(): Record<EventType, EventState> {
  return eventStates;
}

export function cancelPendingNotification(eventType: EventType): void {
  const state = eventStates[eventType];
  if (state.timeout) {
    const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    log(
      `Ending event ${eventType}, elapsed=${elapsed}s, cancelling pending notification`,
    );
    clearTimeout(state.timeout);
    state.timeout = null;
    state.data = null;
    state.hasEnded = false;
    state.startTime = null;
  }
}

export function handleEndEvent(eventType: EventType): void {
  const state = eventStates[eventType];

  if (state.startTime === null) {
    return;
  }

  state.hasEnded = true;
  cancelPendingNotification(eventType);
}

export function handleSessionMessageEndEvents(): void {
  handleEndEvent("complete");
  handleEndEvent("subagent_complete");
  handleEndEvent("error");
}

export function cancelAllPendingNotifications(): void {
  let cancelledCount = 0;
  for (const eventType of ALL_EVENT_TYPES) {
    const state = eventStates[eventType];
    if (state.timeout) {
      const elapsed = state.startTime
        ? (Date.now() - state.startTime) / 1000
        : 0;
      log(
        `User typing detected, cancelling pending notification for ${eventType}, elapsed=${elapsed}s`,
      );
      clearTimeout(state.timeout);
      state.timeout = null;
      state.data = null;
      state.hasEnded = false;
      state.startTime = null;
      cancelledCount++;
    }
  }
  if (cancelledCount > 0) {
    log(
      `Cancelled ${cancelledCount} pending notification(s) due to user typing`,
    );
  }
}
