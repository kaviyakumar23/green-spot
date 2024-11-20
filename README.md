# GreenSpot - Smart Location Sustainability Analyzer

## Project Overview

GreenSpot is a comprehensive web application that leverages Google's Photorealistic 3D Maps to analyze and visualize location sustainability. By integrating multiple Google Maps Platform APIs, it provides real-time environmental metrics and quality-of-life insights.

## Core Features

### 1. Air Quality Layer
- **Visualization**: Creates gradient circles around location with opacity based on AQI
- **Data Source**: Google Air Quality API
- **Scoring (20 points max)**:
  - AQI >= 80: 16-20 points
  - AQI >= 60: 12-16 points
  - AQI >= 40: 8-12 points
  - AQI >= 20: 4-8 points
  - AQI >= 1: 0.2-4 points
- **Panel Features**: Real-time AQI, health recommendations, dominant pollutants

### 2. Solar Potential Layer
- **Visualization**: 3D polygons representing rooftop solar potential
- **Data Source**: Google Solar API
- **Scoring (40 points max)**:
  - Based on average sunshine (kWh/m²/year)
  - Score = min(averageSunshine / 50, 40)
- **Panel Features**: Annual power output, panel configurations, roof segment analysis
- **Known Issue**:  Misalignment of 3D solar panel elements with building geometry

### 3. Walkability Layer
- **Visualization**: 15-minute isochrone with color-coded amenity markers
- **Data Source**: Google Places API
- **Scoring (30 points max)**:
  - Amenity count: Up to 15 points (2 points per amenity)
  - Type diversity: Up to 10 points (2 points per type)
  - Proximity: Up to 5 points (inverse of average distance)
- **Panel Features**: Amenity categorization, distance calculations
- **Known Issue**: Places API sometimes returns incorrect location types

### 4. Green Spaces Layer
- **Visualization**: 3D models with volumetric canopy representation
- **Data Source**: Google Places API (parks)
- **Scoring (30 points max)**:
  - Quantity: Up to 10 points
  - Proximity: Up to 10 points
  - Quality (size, ratings): Up to 10 points
- **Panel Features**: Park details, ratings, size calculations

### 5. Transit Layer
- **Visualization**: Station markers with connection lines
- **Data Source**: Google Places API (transit stations)
- **Scoring (30 points max)**:
  - Based on station count, type diversity, and proximity
  - 3 points per station
  - 5 points per transit type
  - Distance points (10 - average_distance * 2)

## Sustainability Score Calculation
- Total possible score: 100 points
- Grade assignments:
  - A+: 90-100
  - A: 80-89
  - B+: 70-79
  - B: 60-69
  - C+: 50-59
  - C: 40-49
  - D: 30-39
  - F: Below 30

## AI Analysis Integration
- Uses Gemini API for insights generation
- Processes all layer data to generate:
  - Key sustainability strengths
  - Improvement opportunities
  - Overall assessment
- Uses structured prompting for consistent analysis

## Technical Challenges & Solutions


## Future Improvements
1. Enhanced solar panel visualization accuracy
2. Expanded amenity type validation
3. Additional sustainability metrics integration
4. Performance optimization for large areas
5. Historical data trends analysis