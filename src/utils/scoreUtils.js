export const formatNumber = (num) => {
  if (typeof num !== "number") return "N/A";
  return Math.round(num).toLocaleString();
};

export const formatDistance = (distance) => {
  if (typeof distance !== "number") return "N/A";
  return `${distance.toFixed(1)} km`;
};

export const getScoreColor = (score, max) => {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return "success";
  if (percentage >= 60) return "warning";
  return "error";
};

export const getGradeColor = (grade) => {
  switch (grade?.[0]) {
    case "A":
      return "#4CAF50";
    case "B":
      return "#8BC34A";
    case "C":
      return "#FFC107";
    case "D":
      return "#FF9800";
    default:
      return "#F44336";
  }
};

export const getMetricValue = (path, defaultValue = "N/A") => {
  try {
    const value = path();
    return value !== undefined && value !== null ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const getDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLon = deg2rad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

export const getGrade = (score) => {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
};
