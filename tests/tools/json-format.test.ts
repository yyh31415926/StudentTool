import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runJsonFormat } from "../../src/lib/tools/json-format";
import { getToolById } from "../../src/lib/tools/registry";

const templateSource = readFileSync(
  fileURLToPath(
    new URL(
      "../../src/components/tools/templates/TextTransformTemplate.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);

function format(text: string): string {
  return runJsonFormat({ text, action: "format" });
}

function minify(text: string): string {
  return runJsonFormat({ text, action: "minify" });
}

function validate(text: string): string {
  return runJsonFormat({ text, action: "validate" });
}

function lines(...values: string[]): string {
  return values.join("\n");
}

const VALID_SAMPLES = [
  "{}",
  "[]",
  "0",
  "-0",
  '"abc"',
  "true",
  "false",
  "null",
  '{"a":1}',
  '{"a":{"b":[1,2,{"c":"中"}]}}',
  '{"emoji":"😀👨‍👩‍👧🇨🇳"}',
  '{"id":123456789012345678,"ratio":1.0,"exp":1E+3}',
  '{"escaped":"\\u4f60\\u597d","quote":"a\\"b","slash":"c\\\\"}',
  '[1,[2,[3,[]]]]',
];

describe("json-format · 正常输入", () => {
  it("排版单行对象", () => {
    expect(format('{"a":1,"b":2}')).toBe(
      lines("{", '  "a": 1,', '  "b": 2', "}"),
    );
  });

  it("排版数组，并让空容器保持单行", () => {
    expect(format("[1,2,3]")).toBe(lines("[", "  1,", "  2,", "  3", "]"));
    expect(format("[]")).toBe("[]");
    expect(format("[ ]")).toBe("[]");
    expect(format("{}")).toBe("{}");
    expect(format("{ }")).toBe("{}");
  });

  it("排版嵌套对象与数组", () => {
    expect(format('{"a":{"b":[1,{"c":2}]}}')).toBe(
      lines(
        "{",
        '  "a": {',
        '    "b": [',
        "      1,",
        "      {",
        '        "c": 2',
        "      }",
        "    ]",
        "  }",
        "}",
      ),
    );
  });

  it("嵌套空容器组合正确", () => {
    expect(format('{"a":{},"b":[[]]}')).toBe(
      lines("{", '  "a": {},', '  "b": [', "    []", "  ]", "}"),
    );
  });

  it("保留中文键与中文值", () => {
    const input = '{"学生":"小明","班级":"高二(3)班"}';
    const output = format(input);

    expect(output).toBe(
      lines("{", '  "学生": "小明",', '  "班级": "高二(3)班"', "}"),
    );
    expect(JSON.parse(output)).toEqual(JSON.parse(input));
  });

  it("保留 Emoji，不拆开代理对与组合序列", () => {
    const input = '{"mood":"😀","family":"👨‍👩‍👧","flag":"🇨🇳"}';
    const output = format(input);

    expect(JSON.parse(output)).toEqual(JSON.parse(input));
    expect(output).toContain("👨‍👩‍👧");
    expect(output).toContain("🇨🇳");
  });

  it("数字写法逐字符保留（不因序列化被改写）", () => {
    const input =
      '{"a":1.0,"b":-0,"c":1e3,"d":0.5,"e":-12,"f":123456789012345678}';
    const output = format(input);

    expect(output).toContain('"a": 1.0');
    expect(output).toContain('"b": -0');
    expect(output).toContain('"c": 1e3');
    expect(output).toContain('"f": 123456789012345678');
  });

  it("保留 true / false / null", () => {
    expect(format('{"t":true,"f":false,"n":null}')).toBe(
      lines("{", '  "t": true,', '  "f": false,', '  "n": null', "}"),
    );
  });

  it("字符串里的括号、逗号、注释符号不影响结构", () => {
    const input = JSON.stringify({ text: '{"a":1}, [x]: y // z' });
    const output = format(input);

    expect(JSON.parse(output)).toEqual(JSON.parse(input));
    expect(output).toContain('[x]: y // z');
  });

  it("保留 \\uXXXX 转义写法，不解码成中文", () => {
    const input = '{"u":"\\u4f60\\u597d","q":"a\\"b","b":"c\\\\"}';
    const output = format(input);

    expect(output).toContain('"u": "\\u4f60\\u597d"');
    expect(output).not.toContain("你好");
    expect(JSON.parse(output)).toEqual(JSON.parse(input));
  });

  it("CRLF 输入统一输出为 LF", () => {
    const output = format('{\r\n  "a": 1\r\n}');

    expect(output).not.toContain("\r");
    expect(output).toBe(lines("{", '  "a": 1', "}"));
  });

  it("忽略开头的 BOM", () => {
    expect(format(`${"\uFEFF"}{"a":1}`)).toBe(lines("{", '  "a": 1', "}"));
  });

  it("支持顶层标量与顶层数组", () => {
    expect(format("  123  ")).toBe("123");
    expect(format('"abc"')).toBe('"abc"');
    expect(format("true")).toBe("true");
    expect(format("null")).toBe("null");
    expect(format("[[1],[2]]")).toBe(
      lines("[", "  [", "    1", "  ],", "  [", "    2", "  ]", "]"),
    );
  });
});

describe("json-format · 错误输入", () => {
  it("空输入与纯空白分别给出提示", () => {
    expect(() => format("")).toThrow("请输入需要处理的 JSON 文本。");
    expect(() => format("  \n\t ")).toThrow("输入只有空白字符");
  });

  it("非 JSON 文本", () => {
    expect(() => format("hello")).toThrow(
      /第 1 行第 1 列出现 hello，它不是一个 JSON 值/,
    );
    expect(() => format("你好")).toThrow(/第 1 行第 1 列.*不是 JSON 允许的字符/);
  });

  it("对象尾逗号（带行号列号）", () => {
    expect(() => format('{"a":1,}')).toThrow(
      /第 1 行第 8 列有多余的逗号：JSON 不允许在 \} 前保留逗号/,
    );
  });

  it("数组尾逗号", () => {
    expect(() => format("[1,2,]")).toThrow(
      /第 1 行第 6 列有多余的逗号：JSON 不允许在 \] 前保留逗号/,
    );
  });

  it("多行输入的行号按真实行计算", () => {
    expect(() => format('{\n  "a": 1,\n}')).toThrow(/第 3 行第 1 列有多余的逗号/);
  });

  it("单引号", () => {
    expect(() => format("{'a':1}")).toThrow(
      /第 1 行第 2 列出现单引号。JSON 的字符串和键必须使用双引号/,
    );
  });

  it("注释", () => {
    expect(() => format('{\n  // 说明\n  "a": 1\n}')).toThrow(
      /第 2 行第 3 列出现 \/\/ 注释。标准 JSON 不支持注释/,
    );
    expect(() => format('{"a": /* x */ 1}')).toThrow(/\/\* \*\/ 注释/);
    expect(() => format("// 整行注释")).toThrow(/不支持注释/);
  });

  it("未加引号的对象键", () => {
    expect(() => format('{name: "x"}')).toThrow(
      /第 1 行第 2 列对象的键 name 没有加引号/,
    );
    expect(() => format("{1:2}")).toThrow(/对象的键 1 没有加引号/);
  });

  it("缺少闭括号", () => {
    expect(() => format('{"a": 1')).toThrow(
      /第 1 行第 1 列的 \{ 没有闭合，缺少 1 个 \}/,
    );
    expect(() => format("[1,2")).toThrow(/没有闭合，缺少 1 个 \]/);
    expect(() => format("{")).toThrow(/缺少 1 个 \}/);
  });

  it("多余闭括号", () => {
    expect(() => format('{"a":1}}')).toThrow(
      /第 1 行第 8 列多了一个 \}：前面没有与它配对的 \{/,
    );
    expect(() => format("[1]]")).toThrow(/多了一个 \]/);
  });

  it("括号写错类型", () => {
    expect(() => format('{"a":{"b":1]')).toThrow(/缺少一个 \}/);
    expect(() => format("[1}")).toThrow(/缺少一个 \]/);
  });

  it("字符串未闭合与字符串内换行", () => {
    expect(() => format('{"a": "abc\n}')).toThrow(
      /第 1 行第 7 列开始的字符串没有闭合/,
    );
    expect(() => format('{"a": "abc\n}')).toThrow(/不能直接换行，需要写成 \\n/);
    expect(() => format('{"a": "abc')).toThrow(/缺少结束的双引号/);
  });

  it("字符串内的控制字符", () => {
    expect(() => format('{"a":"x\ty"}')).toThrow(/出现制表符（Tab）/);
    expect(() => format('{"a":"x\ty"}')).toThrow(/必须写成 \\t/);
  });

  it("全角标点", () => {
    expect(() => format('{"a":1，\n"b":2}')).toThrow(
      /第 1 行第 7 列出现全角符号「，」。请改成半角符号「,」/,
    );
    expect(() => format('{“a”:1}')).toThrow(/全角符号「“」/);
  });

  it("其他语言的字面量", () => {
    expect(() => format('{"a": undefined}')).toThrow(
      /第 1 行第 7 列出现 undefined.*只支持 true、false 和 null/,
    );
    expect(() => format("None")).toThrow(/只支持 true、false 和 null/);
  });

  it("非法数字写法", () => {
    expect(() => format('{"a": 01}')).toThrow(/前导 0/);
    expect(() => format('{"a": +1}')).toThrow(/不能以 \+ 开头/);
    expect(() => format("[.5]")).toThrow(/不能以小数点开头/);
    expect(() => format("[1.]")).toThrow(/小数点后面缺少数字/);
    expect(() => format('{"a":1e}')).toThrow(/指数部分不完整/);
    expect(() => format("[1-2]")).toThrow(/两个数字之间需要逗号/);
  });

  it("多个顶层值", () => {
    expect(() => format('{"a":1} {"b":2}')).toThrow(
      /第 1 行第 9 列还有内容，但一个 JSON 文档只能有一个顶层值/,
    );
    expect(() => format("{} true")).toThrow(/只能有一个顶层值/);
  });

  it("缺少冒号、缺少逗号、缺少值", () => {
    expect(() => format('{"a" 1}')).toThrow(/的键后面缺少冒号/);
    expect(() => format('{"a":1 "b":2}')).toThrow(/对象里缺少 , 或 \}/);
    expect(() => format("[1 2]")).toThrow(/数组里缺少 , 或 \]/);
    expect(() => format('{"a":}')).toThrow(/冒号后面缺少值/);
    expect(() => format("{,}")).toThrow(/多了一个逗号：这里需要一个键/);
    expect(() => format('{"a":1,,"b":2}')).toThrow(/多了一个逗号：这里需要一个键/);
  });

  it("文档中间的 BOM 会被指出", () => {
    expect(() => format(`{"a":1}${"\uFEFF"}`)).toThrow(
      /字节顺序标记（BOM）/,
    );
  });

  it("三个动作对同一份非法输入给出同一条提示", () => {
    const messages = (["format", "minify", "validate"] as const).map((action) => {
      try {
        runJsonFormat({ text: '{"a":1,}', action });
        return "没有抛错";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });

    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/有多余的逗号/);
  });

  it("拒绝未知动作与非法入参", () => {
    expect(() => runJsonFormat({ text: "{}", action: "pretty" })).toThrow(
      /未知的操作类型/,
    );
    expect(() => runJsonFormat("{}")).toThrow(/需要同时提供文本和操作类型/);
    expect(() => runJsonFormat({ action: "format" })).toThrow(/只接受文本输入/);
  });
});

describe("json-format · 不变量与保真", () => {
  it("格式化是幂等的", () => {
    for (const sample of VALID_SAMPLES) {
      expect(format(format(sample))).toBe(format(sample));
    }
  });

  it("先压缩再格式化与直接格式化结果一致", () => {
    for (const sample of VALID_SAMPLES) {
      expect(format(minify(sample))).toBe(format(sample));
    }
  });

  it("压缩去掉非语义空白并保持语义不变", () => {
    const pretty = lines("{", '  "a": 1,', '  "b": [', "    2", "  ]", "}");

    expect(minify(pretty)).toBe('{"a":1,"b":[2]}');
    expect(JSON.parse(minify(pretty))).toEqual(JSON.parse(pretty));
  });

  it("超出 JavaScript 精确整数范围的数字逐字符保留", () => {
    const input = '{"id":123456789012345678}';

    expect(format(input)).toContain("123456789012345678");
    expect(minify(input)).toBe('{"id":123456789012345678}');
    // 说明为什么不能用 JSON.parse → JSON.stringify 实现格式化：
    expect(String(JSON.parse(input).id)).not.toBe("123456789012345678");
  });

  it("保留重复键，不悄悄合并", () => {
    const input = '{"a":1,"a":2}';

    expect(minify(input)).toBe(input);
    expect(format(input).match(/"a"/g)).toHaveLength(2);
  });

  it("保留 -0、1.0、1E+3 等写法", () => {
    expect(minify('{ "a" : -0 , "b" : 1.0 , "c" : 1E+3 }')).toBe(
      '{"a":-0,"b":1.0,"c":1E+3}',
    );
  });

  it("格式化输出与输入深度相等，键顺序不变", () => {
    for (const sample of VALID_SAMPLES) {
      const before: unknown = JSON.parse(sample);
      const after: unknown = JSON.parse(format(sample));

      expect(after).toEqual(before);
      // 格式化只增删空白，所以压缩结果与输入直接压缩必须一致。
      expect(minify(sample)).toBe(minify(format(sample)));

      if (typeof before === "object" && before !== null) {
        expect(Object.keys(after as object)).toEqual(Object.keys(before));
      }
    }
  });

  it("输出自检：所有合法样本的重排结果都能再次解析", () => {
    for (const sample of VALID_SAMPLES) {
      expect(() => JSON.parse(format(sample))).not.toThrow();
      expect(() => JSON.parse(minify(sample))).not.toThrow();
    }
  });

  it("校验动作给出结论且不修改输入", () => {
    const report = validate('{"a":1}');

    expect(report).toContain("校验通过：这是合法的标准 JSON。");
    expect(report).toContain("顶层类型：对象（1 个键）");
    expect(report).toContain("输入 1 行，格式化后 3 行。");
    expect(validate("[1,2]")).toContain("顶层类型：数组（2 个元素）");
    expect(validate('"x"')).toContain("顶层类型：字符串（1 个字符）");
    expect(validate("123")).toContain("顶层类型：数字");
    expect(validate("true")).toContain("顶层类型：布尔值（true）");
    expect(validate("null")).toContain("顶层类型：null");
  });
});

describe("json-format · 边界与体积", () => {
  it("处理约 1MB 的压缩 JSON", () => {
    const big = JSON.stringify(
      Array.from({ length: 20000 }, (_, index) => ({
        id: index,
        name: `项目${index}`,
        ok: true,
      })),
    );

    expect(big.length).toBeGreaterThan(500000);
    expect(minify(big)).toBe(big);

    const formatted = format(big);
    const parsed = JSON.parse(formatted) as { name: string }[];

    expect(parsed).toHaveLength(20000);
    expect(parsed[19999].name).toBe("项目19999");
  });

  it("处理深层嵌套（60 层）", () => {
    const deep = `${"[".repeat(60)}1${"]".repeat(60)}`;
    const formatted = format(deep);

    expect(formatted.split("\n")).toHaveLength(121);
    expect(JSON.parse(formatted)).toEqual(JSON.parse(deep));
  });

  it("接受语法合法的孤立代理转义", () => {
    const input = '"\\ud800"';

    expect(format(input)).toBe(input);
  });

  it("单个字符的输入给出明确错误", () => {
    expect(() => format("{")).toThrow(/第 1 行第 1 列的 \{ 没有闭合/);
    expect(() => format("[")).toThrow(/第 1 行第 1 列的 \[ 没有闭合/);
    expect(() => format(" ")).toThrow(/输入只有空白字符/);
  });

  it("处理超长单行字符串", () => {
    const input = `{"a":"${"x".repeat(100000)}"}`;
    const formatted = format(input);

    expect(JSON.parse(formatted)).toEqual(JSON.parse(input));
  });
});

describe("json-format · 工具定义与模板约定", () => {
  it("已注册，字段符合契约", () => {
    expect(getToolById("json-format")).toMatchObject({
      id: "json-format",
      name: "JSON 格式化",
      category: "dev",
      template: "text-transform",
      pinyin: "json",
      order: 5,
    });
    expect(getToolById("json-format")?.exampleInput).toBeTruthy();
    expect(getToolById("json-format")?.keywords?.length).toBeGreaterThan(0);
    expect(getToolById("json-format")?.tags?.length).toBeGreaterThanOrEqual(2);
  });

  it("示例输入本身是合法 JSON", () => {
    const example = getToolById("json-format")?.exampleInput ?? "";

    expect(() => JSON.parse(example)).not.toThrow();
  });

  it("声明格式化、压缩、校验三个动作", () => {
    expect(getToolById("json-format")?.actions?.map((action) => action.id)).toEqual([
      "format",
      "minify",
      "validate",
    ]);
  });

  it("通过定义契约调用 run", () => {
    expect(
      getToolById("json-format")?.run({ text: "[1,2]", action: "minify" }),
    ).toBe("[1,2]");
    expect(() =>
      getToolById("json-format")?.run({ text: "[1,2]", action: "pretty" }),
    ).toThrow(/未知的操作类型/);
  });

  it("不设置 errorHint，保证解析错误的行号不会被兜底文案吞掉", () => {
    expect(getToolById("json-format")?.errorHint).toBeUndefined();
  });

  it("模板不针对具体工具 id 写分支", () => {
    expect(templateSource).not.toContain("json-format");
    expect(templateSource).not.toContain("base64");
    expect(templateSource).not.toContain("toolId ===");
  });
});
