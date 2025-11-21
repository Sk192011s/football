import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (_req) => {
  try {
    const targetUrl = "https://www.realty88.com/_view/MOddsGen2.ashx?ot=t&update=true&r=1392804364&ov=0&mt=0&LID=";

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Referer": "https://myanmarlive2d3d.online/",
      },
    });

    if (!response.ok) {
      throw new Error(`External API Error: ${response.status}`);
    }

    const rawData = await response.json();
    const cleanMatches = [];
    
    // The matches are usually located at index 3 of the root array
    const allLeagues = rawData[3]; 

    if (allLeagues && Array.isArray(allLeagues)) {
      for (const leagueGroup of allLeagues) {
        // leagueGroup[0] contains League Info (Index 1 is Name)
        // leagueGroup[1] contains Matches Array
        const leagueName = leagueGroup[0][1]; 
        const matches = leagueGroup[1];

        if (Array.isArray(matches)) {
            for (const m of matches) {
              cleanMatches.push({
                league: leagueName,
                date: m[43],
                time: m[8],
                home_team: m[16],
                away_team: m[20],
                body_hdp: m[22],
                home_odds: m[23],
                away_odds: m[24],
                goal_line: m[26]
              });
            }
        }
      }
    }

    return new Response(JSON.stringify(cleanMatches, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
