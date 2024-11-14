export function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}

export function generateBorderColor(backgroundColor) {
  return backgroundColor.replace("85%", "45%");
}
