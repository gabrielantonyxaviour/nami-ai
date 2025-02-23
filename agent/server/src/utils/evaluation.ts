import type OpenAI from "openai";

export async function validateDisasterDate(
  content: string,
  targetDate: string,
  openai: OpenAI
) {
  try {
    console.log("_validateDisasterDate", "Starting validation", {
      targetDate,
      content: content.substring(0, 200),
    });

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Analyze if this content describes a disaster. 
                       Return JSON: {
                         "isValid": boolean,
                         "isDisaster": boolean,
                         "confidence": number (0-1),
                         "reason": string
                       }`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      model: "deepseek/deepseek-r1-distill-llama-70b",
      temperature: 0,
    });
    const result = JSON.parse(completion.choices[0].message.content || "{}");
    console.log("_validateDisasterDate", "Validation complete", { result });

    return {
      ...result,
      isValid: result.isDisaster && result.confidence > 0.7,
    };
  } catch (error) {
    console.log("_validateDisasterDate", "Validation failed", {
      error: error.message,
      content: content.substring(0, 100) + "...",
    });
    return { isValid: false, isDisaster: false };
  }
}

type Article = {
  title: string;
  snippet: string;
};
export async function _areArticlesRelated(
  article1: Article,
  article2: Article,
  openai: OpenAI
) {
  try {
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Determine if these two articles describe the same disaster event.
                     Consider location, type of disaster, and timing.
                     Return JSON: { "areSame": boolean, "confidence": number }`,
        },
        {
          role: "user",
          content: `Article 1: ${article1.title}\n${article1.snippet}\n\nArticle 2: ${article2.title}\n${article2.snippet}`,
        },
      ],
      model: "hermes-3-llama3.1-8b",
      temperature: 0,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.areSame && result.confidence > 0.7;
  } catch (error) {
    console.log("_areArticlesRelated", "Comparison failed", {
      error: error.message,
    });
    return false;
  }
}

export async function groupRelatedArticles(
  articles: Article[],
  openai: OpenAI
) {
  const groups = [];

  for (const article of articles) {
    let foundGroup = false;

    // Try to add to existing group
    for (const group of groups) {
      if (await _areArticlesRelated(group[0], article, openai)) {
        group.push(article);
        foundGroup = true;
        break;
      }
    }

    // Create new group if no match found
    if (!foundGroup) {
      groups.push([article]);
    }
  }

  return groups;
}

// export async function searchQueries(queries: string[]) {
//     const results = [];

//     for (const query of queries) {
//         const response = await search(query);
//         results.push(...response);
//     }

//     return results;
// }

// export async function search(c: string,q: string, customSearch: any, apiKey: string) {
//     const response = await customSearch.cse.list({
//         auth: apiKey,
//         cx: process.env.GOOGLE_CSE_ID || "",
//         q: query,
//     });

//     return response.data.items || [];
// }
interface NGO {
  id: number;
  name: string;
  location: string;
  description: string;
}

interface Disaster {
  id: number;
  title: string;
  description: string;
  location: string;
  type: string;
}

export function generateNGOActivityQuery(ngo: NGO, disaster: Disaster): string {
  // Clean and prepare the search terms
  const ngoName = `"${ngo.name.trim()}"`;
  const disasterLocation = disaster.location.trim();
  const disasterType = disaster.type.trim();

  // Activity and relief terms that indicate NGO involvement
  const activityTerms = [
    "aid",
    "relief",
    "assistance",
    "helped",
    "donated",
    "supported",
    "deployed",
    "distributed",
    "response",
    "helping",
  ];

  // Construct the core query
  const query = `${ngoName} AND "${disasterLocation}" AND "${disasterType}" AND (${activityTerms.join(" OR ")}) site:reliefweb.int OR site:devex.com OR site:unocha.org`;

  return query;
}
