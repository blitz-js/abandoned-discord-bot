import { BlitzApiRequest, BlitzApiResponse } from "blitz"
import { load } from "cheerio"
import db from "db"
import { compact } from "lodash"

interface DiscussionDom {
  id: number
  title: string
  author: string
  state: "Answered" | "Unanswered"
  createdAt: Date
}

function isState(state: string): state is DiscussionDom["state"] {
  if (["Answered", "Unanswered"].includes(state)) {
    return true
  }

  return false
}

const handler = async (req: BlitzApiRequest, res: BlitzApiResponse) => {
  const scrapedDiscussions: DiscussionDom[] = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const r = await fetch(`https://github.com/blitz-js/blitz/discussions?page=${page}`)
    const html = await r.text()

    const dom = load(html)
    const list = dom(".repository-content > div > div:nth-child(2) > div:nth-child(2) > div")

    list.children().each(function (index, _) {
      const header = dom(this).find('a[data-hovercard-type="discussion"]')
      const title = header.text().trim()
      const id = parseInt(header.attr("href")?.split("/").reverse()[0] || "")

      if (Number.isNaN(id)) {
        if (header.length === 0) {
          return
        }

        throw new Error("Cant find ID")
      }

      const desc = header.parent().find("div")

      const author = desc.find('a[data-hovercard-type="user"]').text().trim()
      const created_at = desc.find("relative-time")
      const state = desc.children().last().text().trim().slice(2)

      if (!isState(state)) {
        console.log(state)

        throw new Error("Cant read state")
      }

      const createdAt = new Date(created_at.attr("datetime") || new Date())

      scrapedDiscussions.push({
        id,
        title,
        author,
        createdAt,
        state,
      })
    })

    hasNext = !dom(".next_page").hasClass("disabled")
    page++
  }

  const discussions = await db.discussion.findMany()

  const promises = compact(
    scrapedDiscussions.map((discussion) => {
      const dbDiscussion = discussions.find((d) => d.id === discussion.id)

      if (!dbDiscussion) {
        console.log("Send new")
        return db.discussion.create({ data: { id: discussion.id } })
      }

      return undefined
    })
  )

  await db.$transaction(promises)

  res.send(scrapedDiscussions.length)
}

export default handler
