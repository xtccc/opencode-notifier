import type { NotifierConfig } from "./config"
import type { EventType } from "./config"

export type { EventType, NotifierConfig }

export type PendingNotificationData = {
  config: NotifierConfig
  eventType: EventType
  projectName: string | null
  elapsedSeconds: number | null
  sessionTitle: string | null
}

export type EventState = {
  startTime: number | null
  hasEnded: boolean
  timeout: ReturnType<typeof setTimeout> | null
  data: PendingNotificationData | null
}

export const ALL_EVENT_TYPES: EventType[] = ["permission", "complete", "subagent_complete", "error", "question"]
