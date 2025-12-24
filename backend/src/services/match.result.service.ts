import Match from "@/models/Match"

class MatchResultService {
  async persistResult(
    matchId: string,
    winner: "white" | "black" | "draw",
    finalFen: string
  ) {
    const match = await Match.findById(matchId)

    if (!match) {
      console.error("❌ Match not found for result persistence", matchId)
      return
    }

    match.status = "FINISHED"
    match.result = {
      winner,
      finalFen,
      finishedAt: new Date(),
    }

    await match.save()

    console.log(`✅ Match ${matchId} persisted as FINISHED`)
  }
}

export const matchResultService = new MatchResultService()
