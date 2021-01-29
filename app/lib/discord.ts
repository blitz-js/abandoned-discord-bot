import { getConfig } from "app/utils/getConfig"
import { Client } from "discord.js"

const client = new Client()

export const discordLogin = async () => {
  if (!client.token) {
    await client.login(getConfig("DISCORD_API_KEY"))
  }
}

export const sendMessage = async (message: string) => {
  await discordLogin()
  const channel = await client.channels.fetch(getConfig("DISCORD_DISCUSSIONS_CHANNEL"))

  // @ts-ignore
  await channel.send(message)
}
