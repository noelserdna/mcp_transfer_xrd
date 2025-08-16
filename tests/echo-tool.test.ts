import { describe, test, expect } from 'vitest';

describe("Echo Tool Logic Tests", () => {
  
  // Simular la lógica de la herramienta echo
  const echoTool = async ({ text }: { text: string }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: `Echo: ${text}`,
        },
      ],
    };
  };

  test("should return correct format for echo tool", async () => {
    const testText = "Test message";
    const result = await echoTool({ text: testText });
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: "text",
      text: `Echo: ${testText}`
    });
  });

  test("should handle empty text", async () => {
    const result = await echoTool({ text: "" });
    
    expect(result.content[0].text).toBe("Echo: ");
  });

  test("should handle long text", async () => {
    const longText = "A".repeat(1000);
    const result = await echoTool({ text: longText });
    
    expect(result.content[0].text).toBe(`Echo: ${longText}`);
    expect(result.content[0].text.length).toBe(1006); // "Echo: " + 1000 chars
  });

  test("should handle text with newlines", async () => {
    const multilineText = "Line 1\nLine 2\nLine 3";
    const result = await echoTool({ text: multilineText });
    
    expect(result.content[0].text).toBe(`Echo: ${multilineText}`);
    expect(result.content[0].text).toContain("\n");
  });

  test("should handle unicode characters", async () => {
    const unicodeText = "🚀 Hello 世界 🌍";
    const result = await echoTool({ text: unicodeText });
    
    expect(result.content[0].text).toBe(`Echo: ${unicodeText}`);
  });

  test("should handle special characters", async () => {
    const specialText = "¡Hola! @#$%^&*()";
    const result = await echoTool({ text: specialText });
    
    expect(result.content[0].text).toBe(`Echo: ${specialText}`);
  });
});