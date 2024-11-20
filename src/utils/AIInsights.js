const prepareAnalysisData = (data) => {
  console.log("Raw data:", data);

  const avgGreenSpaceRating = data.greenSpacesData?.reduce((acc, space) => acc + (space.rating || 0), 0) / (data.greenSpacesData?.length || 1);

  const prompt = `Analyze the available sustainability metrics for this location. Focus on the strengths and opportunities based on the following data:

${
  data.solarData?.solarPotential
    ? `Solar Potential Highlights:
- Maximum Sunshine Hours: ${data.solarData.solarPotential.maxSunshineHoursPerYear} hours/year
- Maximum Array Area: ${data.solarData.solarPotential.maxArrayAreaMeters2} m²
- Carbon Offset Factor: ${data.solarData.solarPotential.carbonOffsetFactorKgPerMwh} kg/MWh`
    : ""
}

${
  data.airQualityData?.indexes?.[0]
    ? `Air Quality Overview:
- AQI: ${data.airQualityData.indexes[0].aqi}
- Category: ${data.airQualityData.indexes[0].category}
- Dominant Pollutant: ${data.airQualityData.dominantPollutant}`
    : ""
}

${
  data.greenSpacesData?.length
    ? `Green Space Assessment:
- Number of Areas: ${data.greenSpacesData.length}
- Average Rating: ${avgGreenSpaceRating.toFixed(1)}`
    : ""
}

${
  data.transitData?.length
    ? `Transit Accessibility (1500m radius):
- Number of Stations: ${data.transitData.length}
- Distribution: ${Object.entries(
        data.transitData.reduce((acc, station) => {
          acc[station.type] = (acc[station.type] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([type, count]) => `${type}: ${count}`)
        .join(", ")}`
    : ""
}

${
  Object.keys(data.walkabilityData || {}).length
    ? `Walkability Analysis (1000m radius):
${Object.entries(data.walkabilityData)
  .map(([type, places]) => `- ${type}: ${places.length} locations`)
  .join("\n")}`
    : ""
}

Based on the available data above, please provide in markdown format:
1. Key sustainability strengths of this location
2. Specific opportunities for improvement
3. Overall sustainability assessment

Please ensure your response uses proper markdown formatting with headers, bullet points, and emphasis where appropriate. Focus your analysis on the metrics that are present, providing actionable insights for the available data.`;

  return { prompt };
};

export const generateInsights = async (solarData, airQualityData, walkabilityData, greenSpacesData, transitData, location) => {
  try {
    const analysisData = prepareAnalysisData({
      solarData,
      airQualityData,
      walkabilityData,
      greenSpacesData,
      transitData,
      location,
    });

    console.log("Sending to AI:", analysisData);
    console.log(import.meta.env.VITE_API_URL);
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysisData),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch insights");
    }

    const data = await response.json();
    return data.body.insights;
  } catch (err) {
    console.error("AI Analysis error:", err);
  }
};
