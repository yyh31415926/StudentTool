import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import {
  buildQrMatrix,
  buildQrSvg,
  contrastRatio,
  hasSufficientContrast,
  isSupportedImageType,
  normalizeQrOptions,
  parseHexColor,
  resolveImageType,
  runQrEncode,
  validateImageMeta,
  validateQrInput,
  QR_CONTRAST_THRESHOLD,
  QR_IMAGE_MAX_BYTES,
  QR_MAX_INPUT_LENGTH,
  QR_QUIET_ZONE_MODULES,
  QR_DEFAULT_OPTIONS,
  type QrMatrix,
} from "../../src/lib/tools/qrcode";

describe("validateQrInput", () => {
  it("accepts ordinary text and returns it unchanged", () => {
    expect(validateQrInput("hello")).toBe("hello");
  });

  it("rejects empty input", () => {
    expect(() => validateQrInput("")).toThrow("空内容");
  });

  it("rejects whitespace-only input", () => {
    expect(() => validateQrInput("  \n\t ")).toThrow("空内容");
  });

  it("rejects non-string input", () => {
    expect(() => validateQrInput(123 as unknown)).toThrow("只接受文本");
  });

  it("rejects oversized input", () => {
    expect(() => validateQrInput("a".repeat(QR_MAX_INPUT_LENGTH + 1))).toThrow(
      "内容过长",
    );
  });
});

describe("parseHexColor", () => {
  it("normalizes shorthand hex", () => {
    expect(parseHexColor("#abc")).toBe("#aabbcc");
  });

  it("lowercases full hex", () => {
    expect(parseHexColor("#ABCDEF")).toBe("#abcdef");
  });

  it("rejects invalid colors", () => {
    expect(() => parseHexColor("#12")).toThrow("颜色格式");
    expect(() => parseHexColor("red")).toThrow("颜色格式");
    expect(() => parseHexColor("#gggggg")).toThrow("颜色格式");
  });
});

describe("contrastRatio / hasSufficientContrast", () => {
  it("reports high contrast for black on white", () => {
    const ratio = contrastRatio("#000000", "#ffffff");

    expect(ratio).toBeGreaterThan(15);
    expect(hasSufficientContrast("#000000", "#ffffff")).toBe(true);
  });

  it("reports low contrast for identical colors", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(hasSufficientContrast("#ffffff", "#ffffff")).toBe(false);
  });

  it("flags insufficient contrast against the threshold", () => {
    expect(hasSufficientContrast("#888888", "#999999")).toBe(false);
    expect(contrastRatio("#888888", "#999999")).toBeLessThan(
      QR_CONTRAST_THRESHOLD,
    );
  });
});

describe("normalizeQrOptions", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeQrOptions()).toEqual(QR_DEFAULT_OPTIONS);
  });

  it("rejects out-of-range size", () => {
    expect(() => normalizeQrOptions({ size: 10 })).toThrow("尺寸");
    expect(() => normalizeQrOptions({ size: 2048 })).toThrow("尺寸");
    expect(() => normalizeQrOptions({ size: 100.5 })).toThrow("尺寸");
  });

  it("rejects invalid error correction level", () => {
    expect(() =>
      normalizeQrOptions({ errorCorrectionLevel: "X" as never }),
    ).toThrow("纠错等级");
  });

  it("rejects invalid dot style", () => {
    expect(() => normalizeQrOptions({ dotStyle: "triangle" as never })).toThrow(
      "模块样式",
    );
  });

  it("rejects invalid foreground color", () => {
    expect(() => normalizeQrOptions({ foreground: "blue" })).toThrow(
      "颜色格式",
    );
  });
});

describe("buildQrMatrix", () => {
  it("generates a non-empty matrix for ASCII text", () => {
    expect(buildQrMatrix("hello", "M").size).toBeGreaterThan(0);
  });

  it("generates a matrix for Chinese text", () => {
    const matrix = buildQrMatrix("你好世界", "M");

    expect(matrix.size).toBeGreaterThan(0);
    expect(matrix.data.length).toBe(matrix.size * matrix.size);
  });

  it("generates a matrix for Emoji", () => {
    expect(buildQrMatrix("😀👍", "H").size).toBeGreaterThan(0);
  });

  it("throws a clear error when content is too long for the level", () => {
    expect(() => buildQrMatrix("中".repeat(QR_MAX_INPUT_LENGTH), "H")).toThrow(
      /内容过长|二维码生成失败/,
    );
  });
});

describe("buildQrSvg", () => {
  it("starts with an svg tag and includes the background", () => {
    const matrix = buildQrMatrix("test", "M");
    const svg = buildQrSvg(matrix, QR_DEFAULT_OPTIONS);

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`fill="${QR_DEFAULT_OPTIONS.background}"`);
  });

  it("renders square modules as rects only", () => {
    const matrix = buildQrMatrix("test", "M");
    const svg = buildQrSvg(matrix, { ...QR_DEFAULT_OPTIONS, dotStyle: "square" });

    expect(svg).toContain("<rect");
    expect(svg).not.toContain("<circle");
  });

  it("renders dot style with circles but keeps finder patterns square", () => {
    const matrix = buildQrMatrix("test", "M");
    const svg = buildQrSvg(matrix, { ...QR_DEFAULT_OPTIONS, dotStyle: "dots" });

    expect(svg).toContain("<circle");
    expect(svg).toContain("<rect");
  });

  it("renders rounded style with rounded rects", () => {
    const matrix = buildQrMatrix("test", "M");
    const svg = buildQrSvg(matrix, {
      ...QR_DEFAULT_OPTIONS,
      dotStyle: "rounded",
    });

    expect(svg).toContain('rx="0.28"');
  });
});

describe("image type / meta validation", () => {
  it("recognizes supported image types", () => {
    expect(isSupportedImageType("image/png")).toBe(true);
    expect(isSupportedImageType("image/jpeg")).toBe(true);
    expect(isSupportedImageType("image/webp")).toBe(true);
    expect(isSupportedImageType("image/gif")).toBe(false);
  });

  it("resolves type from extension when mime is empty", () => {
    expect(resolveImageType("photo.PNG", "")).toBe("image/png");
    expect(resolveImageType("photo.jpg", "")).toBe("image/jpeg");
    expect(resolveImageType("photo.webp", "")).toBe("image/webp");
    expect(resolveImageType("photo.gif", "")).toBe("");
  });

  it("validates size against the 5MB limit", () => {
    expect(() =>
      validateImageMeta({ type: "image/png", size: 1024 }),
    ).not.toThrow();
    expect(() =>
      validateImageMeta({ type: "image/png", size: QR_IMAGE_MAX_BYTES + 1 }),
    ).toThrow("超过 5MB");
  });

  it("rejects unsupported formats", () => {
    expect(() => validateImageMeta({ type: "image/gif", size: 10 })).toThrow(
      "不支持的图片格式",
    );
  });
});

describe("runQrEncode", () => {
  it("returns an SVG string for valid input", () => {
    const svg = runQrEncode({ text: "https://example.com" });

    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("rejects empty text", () => {
    expect(() => runQrEncode({ text: "" })).toThrow("空内容");
  });

  it("rejects non-object input", () => {
    expect(() => runQrEncode("hello")).toThrow("需要同时提供");
  });
});

describe("encode → decode round trip", () => {
  function matrixToRgba(matrix: QrMatrix, scale: number, margin: number) {
    const dimension = (matrix.size + margin * 2) * scale;
    const data = new Uint8ClampedArray(dimension * dimension * 4);

    for (let py = 0; py < dimension; py += 1) {
      for (let px = 0; px < dimension; px += 1) {
        const col = Math.floor(px / scale) - margin;
        const row = Math.floor(py / scale) - margin;
        const isDark =
          row >= 0 &&
          row < matrix.size &&
          col >= 0 &&
          col < matrix.size &&
          matrix.data[row * matrix.size + col] === 1;
        const value = isDark ? 0 : 255;
        const offset = (py * dimension + px) * 4;

        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
      }
    }

    return { data, width: dimension, height: dimension };
  }

  function roundTrip(text: string): string | null {
    const matrix = buildQrMatrix(text, "M");
    const { data, width } = matrixToRgba(
      matrix,
      4,
      QR_QUIET_ZONE_MODULES,
    );
    const code = jsQR(data, width, width);

    return code?.data ?? null;
  }

  it("round-trips ASCII text", () => {
    expect(roundTrip("hello")).toBe("hello");
  });

  it("round-trips a URL", () => {
    expect(roundTrip("https://example.com/a?b=1")).toBe(
      "https://example.com/a?b=1",
    );
  });

  it("round-trips Chinese text", () => {
    expect(roundTrip("你好，世界")).toBe("你好，世界");
  });

  it("round-trips Emoji", () => {
    expect(roundTrip("😀👍🎉")).toBe("😀👍🎉");
  });
});
