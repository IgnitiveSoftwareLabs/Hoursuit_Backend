export const weightConversionToKg: Record<string, number> = {
    kg: 1,
    tons: 1000,
    quintals: 100,
    liters: 1, // assuming 1L = 1kg
  };
  
  export const sizeConversionToMeters: Record<string, number> = {
    meters: 1,
    feet: 0.3048,
    inches: 0.0254,
    centimeters: 0.01,
  };
  
  export function convertValue(
    value: number,
    fromUnit: string,
    toUnit: string,
    conversionMap: Record<string, number>
  ): number {
    const fromFactor = conversionMap[fromUnit];
    const toFactor = conversionMap[toUnit];
  
    if (!fromFactor || !toFactor) {
      throw new Error(`Invalid conversion from ${fromUnit} to ${toUnit}`);
    }
  
    return (value * fromFactor) / toFactor;
  }