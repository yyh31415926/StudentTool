import { describe, expect, it } from "vitest";
import {
  computeOcrScale,
  isSupportedImageType,
  normalizeOcrLanguage,
  resolveImageType,
  runImageOcr,
  validateImageDimension,
  validateImageMeta,
  OCR_DEFAULT_LANGUAGE,
  OCR_IMAGE_MAX_BYTES,
  OCR_LANGUAGE_OPTIONS,
  OCR_MAX_DIMENSION,
  OCR_WORK_DIMENSION,
} from "../../src/lib/tools/image-ocr";

describe("normalizeOcrLanguage", () => {
  it("returns the default (mixed) language when input is undefined", () => {
    expect(normalizeOcrLanguage(undefined)).toMatchObject({
      id: OCR_DEFAULT_LANGUAGE,
      label: "中英混合",
      lang: "chi_sim+eng",
    });
  });

  it("returns the default (mixed) language when input is null", () => {
    expect(normalizeOcrLanguage(null)).toMatchObject({ id: "mixed" });
  });

  it("maps each valid language to its tesseract code", () => {
    expect(normalizeOcrLanguage("zh")).toMatchObject({
      label: "简体中文",
      lang: "chi_sim",
    });
    expect(normalizeOcrLanguage("en")).toMatchObject({
      label: "英文",
      lang: "eng",
    });
    expect(normalizeOcrLanguage("mixed")).toMatchObject({
      label: "中英混合",
      lang: "chi_sim+eng",
    });
  });

  it("rejects an unknown language id", () => {
    expect(() => normalizeOcrLanguage("fr")).toThrow("语言选择不正确");
  });

  it("rejects an empty string", () => {
    expect(() => normalizeOcrLanguage("")).toThrow("语言选择不正确");
  });

  it("rejects a non-string value", () => {
    expect(() => normalizeOcrLanguage(123 as unknown)).toThrow(
      "语言选择不正确",
    );
  });

  it("exposes exactly three selectable options", () => {
    expect(OCR_LANGUAGE_OPTIONS.map((option) => option.id)).toEqual([
      "zh",
      "en",
      "mixed",
    ]);
  });
});

describe("isSupportedImageType", () => {
  it("recognizes supported types", () => {
    expect(isSupportedImageType("image/png")).toBe(true);
    expect(isSupportedImageType("image/jpeg")).toBe(true);
    expect(isSupportedImageType("image/webp")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isSupportedImageType("IMAGE/PNG")).toBe(true);
  });

  it("rejects unsupported types", () => {
    expect(isSupportedImageType("image/gif")).toBe(false);
    expect(isSupportedImageType("image/bmp")).toBe(false);
    expect(isSupportedImageType("image/svg+xml")).toBe(false);
    expect(isSupportedImageType("")).toBe(false);
  });
});

describe("resolveImageType", () => {
  it("prefers the provided mime type", () => {
    expect(resolveImageType("photo.txt", "image/png")).toBe("image/png");
  });

  it("falls back to the file extension when mime is empty", () => {
    expect(resolveImageType("photo.PNG", "")).toBe("image/png");
    expect(resolveImageType("photo.jpg", "")).toBe("image/jpeg");
    expect(resolveImageType("photo.jpeg", "")).toBe("image/jpeg");
    expect(resolveImageType("photo.webp", "")).toBe("image/webp");
  });

  it("returns an empty string for unknown files", () => {
    expect(resolveImageType("photo.gif", "")).toBe("");
    expect(resolveImageType("photo", "")).toBe("");
  });
});

describe("validateImageMeta", () => {
  it("accepts a supported type within the size limit", () => {
    expect(() =>
      validateImageMeta({ type: "image/png", size: 1024 }),
    ).not.toThrow();
  });

  it("accepts a file exactly at the 10MB limit", () => {
    expect(() =>
      validateImageMeta({ type: "image/png", size: OCR_IMAGE_MAX_BYTES }),
    ).not.toThrow();
  });

  it("rejects a file over the 10MB limit", () => {
    expect(() =>
      validateImageMeta({ type: "image/png", size: OCR_IMAGE_MAX_BYTES + 1 }),
    ).toThrow("超过 10MB");
  });

  it("rejects an unsupported format", () => {
    expect(() => validateImageMeta({ type: "image/gif", size: 10 })).toThrow(
      "不支持的图片格式",
    );
  });
});

describe("validateImageDimension", () => {
  it("accepts a normal-size image", () => {
    expect(() => validateImageDimension(1200, 800)).not.toThrow();
  });

  it("accepts an image exactly at the dimension limit", () => {
    expect(() =>
      validateImageDimension(OCR_MAX_DIMENSION, 100),
    ).not.toThrow();
  });

  it("rejects an image whose longest side exceeds the limit", () => {
    expect(() =>
      validateImageDimension(OCR_MAX_DIMENSION + 1, 100),
    ).toThrow("图片尺寸过大");
  });
});

describe("computeOcrScale", () => {
  it("returns 1 for small images (no downscale)", () => {
    expect(computeOcrScale(100, 100)).toBe(1);
  });

  it("downscales images larger than the work dimension", () => {
    const scale = computeOcrScale(OCR_WORK_DIMENSION * 2, OCR_WORK_DIMENSION);

    expect(scale).toBeCloseTo(0.5, 5);
  });

  it("returns 1 for zero dimensions instead of dividing by zero", () => {
    expect(computeOcrScale(0, 0)).toBe(1);
  });
});

describe("runImageOcr", () => {
  it("returns the normalized config for a valid language", () => {
    expect(runImageOcr({ language: "zh" })).toEqual({
      id: "zh",
      label: "简体中文",
      lang: "chi_sim",
    });
  });

  it("defaults to mixed when language is omitted", () => {
    expect(runImageOcr({})).toMatchObject({ id: "mixed" });
  });

  it("throws for an invalid language", () => {
    expect(() => runImageOcr({ language: "xx" as never })).toThrow(
      "语言选择不正确",
    );
  });

  it("throws for non-object input", () => {
    expect(() => runImageOcr("zh")).toThrow("需要选择识别语言");
    expect(() => runImageOcr(null)).toThrow("需要选择识别语言");
  });
});
