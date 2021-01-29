import { load } from "cheerio"
import db from "db"

import { sendMessage } from "app/lib/discord"
import { isDev } from "app/utils/getConfig"

interface DiscussionDom {
  id: number
  link: string
  title: string
  author: string
  category: string
  state: "Answered" | "Unanswered" | undefined
  createdAt: Date
}

function isState(state?: string): state is DiscussionDom["state"] {
  return !state || ["Answered", "Unanswered"].includes(state)
}

const formatMessage = (discussion: DiscussionDom) =>
  `New discussion was posted in ${discussion.category} by ${discussion.author}:\n**${discussion.title}**\n${discussion.link}`

const REPO_URL = isDev()
  ? "https://github.com/Zeko369/testing-discussion-bot/"
  : "https://github.com/blitz-js/blitz/"

export const updateDiscussions = async () => {
  const scrapedDiscussions: DiscussionDom[] = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const r = await fetch(`${REPO_URL}discussions?page=${page}`)
    const html = await r.text()

    const dom = load(html)
    const list = dom(".repository-content > div > div:nth-child(2) > div:nth-child(2) > div")

    list.children().each(function (index, _) {
      const header = dom(this).find('a[data-hovercard-type="discussion"]')
      const title = header.text().trim()
      const link = `https://github.com/${header.attr("href") || ""}`
      const id = parseInt(link.split("/").reverse()[0] || "")

      if (Number.isNaN(id)) {
        if (header.length === 0) {
          return
        }

        throw new Error("Cant find ID")
      }

      const desc = header.parent().find("div")

      const author = desc.find('a[data-hovercard-type="user"]').text().trim()
      const created_at = desc.find("relative-time")
      const category = desc.find(":nth-child(5)").text().trim()
      const state = desc.children().last().text().trim().slice(2)

      if (!isState(state)) {
        console.log(state)

        throw new Error("Cant read state")
      }

      const createdAt = new Date(created_at.attr("datetime") || new Date())

      scrapedDiscussions.push({
        id,
        title,
        link,
        author,
        category,
        createdAt,
        state,
      })
    })

    const nextButton = dom(".next_page").get()

    if (nextButton.length === 1) {
      hasNext = !dom(".next_page").hasClass("disabled")
      page++
    } else {
      hasNext = false
    }
  }

  const discussions = await db.discussion.findMany()

  // Hack to not send all existing
  let dontSend = false
  if (discussions.length === 0) {
    dontSend = true
  }

  await Promise.all(
    scrapedDiscussions.map(async (discussion) => {
      const dbDiscussion = discussions.find((d) => d.id === discussion.id)

      if (!dbDiscussion) {
        if (!dontSend) {
          await sendMessage(formatMessage(discussion))
        }

        await db.discussion.create({ data: { id: discussion.id } })
      }

      return undefined
    })
  )
}
