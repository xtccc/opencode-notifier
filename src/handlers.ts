import type { PluginInput } from "@opencode-ai/plugin"
import type { EventType, NotifierConfig } from "./config"
import { isEventSoundEnabled, isEventNotificationEnabled, getMessage, getSoundPath, getIconPath } from "./config"
import { sendNotification } from "./notify"
import { playSound } from "./sound"
import { runCommand } from "./command"
import { getEventStates } from "./event-state"
import { log } from "./logger"
import { getSessionIDFromEvent, getSessionTitle, getElapsedSinceLastPrompt } from "./session"

export function getNotificationTitle(config: NotifierConfig, projectName: string | null, sessionTitle?: string | null): string {
  if (sessionTitle) {
    return `OpenCode: ${sessionTitle}`
  }
  if (config.showProjectName && projectName) {
    return `OpenCode (${projectName})`
  }
  return "OpenCode"
}

export async function sendPendingNotification(eventType: EventType): Promise<void> {
  const states = getEventStates()
  const state = states[eventType]
  const data = state.data

  if (!data) {
    log(`No pending data for ${eventType}, skipping notification`)
    return
  }

  if (state.hasEnded) {
    log(`Event ${eventType} has already ended, skipping notification`)
    state.timeout = null
    state.data = null
    return
  }

  log(`Timeout expired, sending notification for ${eventType}`)

  const { config, projectName, elapsedSeconds, sessionTitle } = data
  state.timeout = null
  state.data = null

  const promises: Promise<void>[] = []
  const message = getMessage(config, eventType)

  if (isEventNotificationEnabled(config, eventType)) {
    const title = getNotificationTitle(config, projectName, sessionTitle)
    const iconPath = getIconPath(config)
    promises.push(sendNotification(title, message, config.timeout, iconPath, config.notificationSystem))
  }

  if (isEventSoundEnabled(config, eventType)) {
    const customSoundPath = getSoundPath(config, eventType)
    promises.push(playSound(eventType, customSoundPath))
  }

  const minDuration = config.command?.minDuration
  const shouldSkipCommand =
    typeof minDuration === "number" &&
    Number.isFinite(minDuration) &&
    minDuration > 0 &&
    typeof elapsedSeconds === "number" &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds < minDuration

  if (!shouldSkipCommand) {
    const title = getNotificationTitle(config, projectName, sessionTitle)
    runCommand(config, eventType, message, projectName, title)
  }

  await Promise.allSettled(promises)
}

export async function handleEvent(
  config: NotifierConfig,
  eventType: EventType,
  projectName: string | null,
  elapsedSeconds?: number | null,
  sessionTitle?: string | null
): Promise<void> {
  log(`Starting event: ${eventType}, suppressWhenFocused=${config.suppressWhenFocused}`)

  const states = getEventStates()

  if (config.suppressWhenFocused) {
    const state = states[eventType]
    const now = Date.now()

    state.startTime = now
    state.hasEnded = false
    state.data = {
      config,
      eventType,
      projectName,
      elapsedSeconds: elapsedSeconds ?? null,
      sessionTitle: sessionTitle ?? null,
    }

    state.timeout = setTimeout(() => {
      sendPendingNotification(eventType)
    }, config.focusWindowSeconds * 1000)

    log(`Pending notification scheduled for ${eventType} in ${config.focusWindowSeconds}s`)
    return
  }

  log(`suppressWhenFocused disabled, sending notification immediately for ${eventType}`)

  const promises: Promise<void>[] = []
  const message = getMessage(config, eventType)

  if (isEventNotificationEnabled(config, eventType)) {
    const title = getNotificationTitle(config, projectName, sessionTitle)
    const iconPath = getIconPath(config)
    promises.push(sendNotification(title, message, config.timeout, iconPath, config.notificationSystem))
  }

  if (isEventSoundEnabled(config, eventType)) {
    const customSoundPath = getSoundPath(config, eventType)
    promises.push(playSound(eventType, customSoundPath))
  }

  const minDuration = config.command?.minDuration
  const shouldSkipCommand =
    typeof minDuration === "number" &&
    Number.isFinite(minDuration) &&
    minDuration > 0 &&
    typeof elapsedSeconds === "number" &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds < minDuration

  if (!shouldSkipCommand) {
    const title = getNotificationTitle(config, projectName, sessionTitle)
    runCommand(config, eventType, message, projectName, title)
  }

  await Promise.allSettled(promises)
}

export async function handleEventWithElapsedTime(
  client: PluginInput["client"],
  config: NotifierConfig,
  eventType: EventType,
  projectName: string | null,
  event: unknown
): Promise<void> {
  const minDuration = config.command?.minDuration
  const shouldLookupElapsed =
    !!config.command?.enabled &&
    typeof config.command?.path === "string" &&
    config.command.path.length > 0 &&
    typeof minDuration === "number" &&
    Number.isFinite(minDuration) &&
    minDuration > 0

  const sessionID = getSessionIDFromEvent(event)

  let elapsedSeconds: number | null = null
  if (shouldLookupElapsed && sessionID) {
    elapsedSeconds = await getElapsedSinceLastPrompt(client, sessionID)
  }

  let sessionTitle: string | null = null
  if (sessionID) {
    sessionTitle = await getSessionTitle(client, sessionID)
  }

  await handleEvent(config, eventType, projectName, elapsedSeconds, sessionTitle)
}
