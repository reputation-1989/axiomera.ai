import axios from 'axios';

export async function performWebSearch(query) {
  // We check if the key exists, otherwise we skip search
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    console.log("⚠️ No Tavily API Key found. Skipping web search.");
    return null;
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: query,
      search_depth: "smart",
      max_results: 5
    });

    return response.data.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content
    }));
  } catch (error) {
    console.error("Search failed:", error);
    return null;
  }
}
