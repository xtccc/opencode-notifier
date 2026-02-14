import type { PluginInput } from "@opencode-ai/plugin"

export function getSessionIDFromEvent(event: unknown): string | null {
  const sessionID = (event as any)?.properties?.sessionID
  if (typeof sessionID === "string" && sessionID.length > 0) {
    return sessionID
  }
  return null
}

export async function getSessionTitle(
  client: PluginInput["client"],
  sessionID: string
): Promise<string | null> {
  try {
    const response = await client.session.get({ path: { id: sessionID } })
    return response.data?.title ?? null
  } catch {
    return null
  }
}

export async function isChildSession(
  client: PluginInput["client"],
  sessionID: string
): Promise<boolean> {
  try {
    const response = await client.session.get({ path: { id: sessionID } })
    const parentID = response.data?.parentID
    return !!parentID
  } catch {
    return false
  }
}

export async function getElapsedSinceLastPrompt(
  client: PluginInput["client"],
  sessionID: string
): Promise<number | null> {
  try {
    const response = await client.session.messages({ path: { id: sessionID } })
    const messages = response.data ?? []

    let lastUserMessageTime: number | null = null
    for (const msg of messages) {
      const info = msg.info
      if (info.role === "user" && typeof info.time?.created === "number") {
        if (lastUserMessageTime === null || info.time.created > lastUserMessageTime) {
          lastUserMessageTime = info.time.created
        }
      }
    }

    if (lastUserMessageTime !== null) {
      return (Date.now() - lastUserMessageTime) / 1000
    }
  } catch {
  }

  return null
}
