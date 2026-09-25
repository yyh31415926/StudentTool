"use client";

import type { QrEncodeOptions, QrDotStyle, QrErrorCorrectionLevel } from "@/lib/tools/qrcode";
import { Select } from "@/components/ui/Select";

type QRCodeStyleControlsProps = {
  options: QrEncodeOptions;
  onChange: (next: QrEncodeOptions) => void;
};

const SIZE_OPTIONS = [128, 192, 256, 320, 512];

const EC_OPTIONS: readonly { value: QrErrorCorrectionLevel; label: string }[] = [
  { value: "L", label: "L（低）" },
  { value: "M", label: "M（中）" },
  { value: "Q", label: "Q（较高）" },
  { value: "H", label: "H（高）" },
];

const DOT_STYLES: readonly { value: QrDotStyle; label: string }[] = [
  { value: "square", label: "方形" },
  { value: "dots", label: "圆点" },
  { value: "rounded", label: "圆角" },
];

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {children}
    </label>
  );
}

/**
 * 生成选项控件：尺寸、前景色、背景色、纠错等级、模块样式。
 * 只负责展示与派发，不参与生成逻辑。
 */
export function QRCodeStyleControls({ options, onChange }: QRCodeStyleControlsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <FieldLabel htmlFor="qr-size">尺寸</FieldLabel>
        <Select
          id="qr-size"
          value={options.size}
          onChange={(event) =>
            onChange({ ...options, size: Number(event.target.value) })
          }
        >
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} px
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <FieldLabel htmlFor="qr-ec">纠错等级</FieldLabel>
        <Select
          id="qr-ec"
          value={options.errorCorrectionLevel}
          onChange={(event) =>
            onChange({
              ...options,
              errorCorrectionLevel: event.target.value as QrErrorCorrectionLevel,
            })
          }
        >
          {EC_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <FieldLabel htmlFor="qr-fg">前景色</FieldLabel>
        <input
          id="qr-fg"
          type="color"
          value={options.foreground}
          onChange={(event) =>
            onChange({ ...options, foreground: event.target.value })
          }
          className="h-touch w-full cursor-pointer rounded-control border border-border bg-surface p-1"
        />
      </div>

      <div className="space-y-1">
        <FieldLabel htmlFor="qr-bg">背景色</FieldLabel>
        <input
          id="qr-bg"
          type="color"
          value={options.background}
          onChange={(event) =>
            onChange({ ...options, background: event.target.value })
          }
          className="h-touch w-full cursor-pointer rounded-control border border-border bg-surface p-1"
        />
      </div>

      <fieldset className="space-y-1 sm:col-span-2">
        <legend className="text-sm font-medium">模块样式</legend>
        <div className="flex gap-2">
          {DOT_STYLES.map((style) => {
            const isActive = options.dotStyle === style.value;

            return (
              <button
                key={style.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange({ ...options, dotStyle: style.value })}
                className={`min-h-touch flex-1 rounded-control px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-surface text-foreground hover:bg-surface-muted"
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
