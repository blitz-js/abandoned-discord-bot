import { updateDiscussions } from "app/lib/tasks/updateDiscussions"
import { CronJob } from "quirrel/blitz"

export default CronJob("api/updateDiscussions", "* * * * *", updateDiscussions)
