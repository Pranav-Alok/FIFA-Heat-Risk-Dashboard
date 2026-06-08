export type TempUnit = 'C' | 'F';

/**
 * Converts Celsius to the target unit (C or F).
 * Enforces exact conversion: F = (C * 9/5) + 32
 */
export function convertCelsiusToUnit(celsius: number, unit: TempUnit): number {
  if (unit === 'F') {
    return (celsius * 9) / 5 + 32;
  }
  return celsius;
}

/**
 * Formats a Celsius value into the selected unit with optional suffix.
 * Always rounds the displayed value to exactly one decimal place.
 * Examples:
 * 26.7°C -> 80.1°F (converted: 80.06 -> 80.1)
 * 37.8°C -> 100.0°F (converted: 100.04 -> 100.0)
 * 15.7°C -> 60.3°F (converted: 60.26 -> 60.3)
 */
export function formatTemp(celsius: number, unit: TempUnit, suffix: boolean = true): string {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return '';
  const converted = convertCelsiusToUnit(celsius, unit);
  const rounded = Math.round(converted * 10) / 10;
  return `${rounded.toFixed(1)}${suffix ? `°${unit}` : ''}`;
}

/**
 * Returns just the rounded formatted number string as a value without the unit marker.
 */
export function formatTempNumber(celsius: number, unit: TempUnit): string {
  if (celsius === undefined || celsius === null || isNaN(celsius)) return '';
  const converted = convertCelsiusToUnit(celsius, unit);
  const rounded = Math.round(converted * 10) / 10;
  return rounded.toFixed(1);
}
