import type { Plugin } from "@opencode-ai/plugin"
import { basename } from "path"
import { loadConfig } from "./config"
import { log } from "./logger"
import { handleEventWithElapsedTime } from "./handlers"
import { handleEndEvent, handleSessionMessageEndEvents } from "./event-state"
import { getSessionIDFromEvent, isChildSession } from "./session"

export const NotifierPlugin: Plugin = async ({ client, directory }) => {
  const config = loadConfig()
  const projectName = directory ? basename(directory) : null

  log(`Plugin initialized: suppressWhenFocused=${config.suppressWhenFocused}, focusWindowSeconds=${config.focusWindowSeconds}`)

  return {
    event: async ({ event }) => {
      const eventType = (event as any).type as string

      if (eventType === "session.idle") {
        log(`Event: session.idle -> starting complete/subagent_complete`)

        const sessionID = getSessionIDFromEvent(event)
        if (sessionID) {
          const isChild = await isChildSession(client, sessionID)
          if (!isChild) {
            await handleEventWithElapsedTime(client, config, "complete", projectName, event)
          } else {
            await handleEventWithElapsedTime(client, config, "subagent_complete", projectName, event)
          }
        } else {
          await handleEventWithElapsedTime(client, config, "complete", projectName, event)
        }
        return
      }

      if (eventType === "session.error") {
        log(`Event: session.error -> starting error`)
        await handleEventWithElapsedTime(client, config, "error", projectName, event)
        return
      }

      if (eventType === "session.updated" || eventType === "message.updated") {
        log(`Event: ${eventType} -> ending complete/subagent_complete/error`)
        handleSessionMessageEndEvents()
        return
      }

      if (eventType === "permission.replied") {
        log(`Event: permission.replied -> ending permission`)
        handleEndEvent("permission")
        return
      }

      if (eventType === "tool.execute.after") {
        const toolName = (event as any)?.properties?.tool
        if (toolName === "question") {
          log(`Event: tool.execute.after (question) -> ending question`)
          handleEndEvent("question")
        }
        return
      }
    },
    "permission.ask": async () => {
      log(`Hook: permission.ask -> starting permission`)
      await handleEventWithElapsedTime(client, config, "permission", projectName, { type: "permission.ask" })
    },
    "tool.execute.before": async (input) => {
      if (input.tool === "question") {
        log(`Hook: tool.execute.before (question) -> starting question`)
        await handleEventWithElapsedTime(client, config, "question", projectName, { type: "tool.execute.before", properties: { tool: "question" } })
      }
    },
  }
}

export default NotifierPlugin
