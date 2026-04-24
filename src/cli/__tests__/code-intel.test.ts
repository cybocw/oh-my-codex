import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  codeIntelCommand,
  executeCodeIntelCommand,
  parseCodeIntelCliArgs,
} from "../code-intel.js";

describe("parseCodeIntelCliArgs", () => {
  it("treats help as a local help request", () => {
    assert.deepEqual(parseCodeIntelCliArgs(["help"]), {
      help: true,
      input: {},
      json: false,
      toolName: null,
    });
  });

  it("parses tool input and json output flags", () => {
    assert.deepEqual(
      parseCodeIntelCliArgs([
        "lsp_diagnostics",
        "--input",
        '{"file":"src/cli/index.ts"}',
        "--json",
      ]),
      {
        help: false,
        input: { file: "src/cli/index.ts" },
        json: true,
        toolName: "lsp_diagnostics",
      },
    );
  });
});

describe("executeCodeIntelCommand", () => {
  it("returns help text without invoking a tool", async () => {
    const result = await executeCodeIntelCommand(["help"]);
    assert.equal(result.ok, true);
    assert.match("help" in result ? result.help : "", /Usage: omx code-intel/);
  });
});

describe("codeIntelCommand", () => {
  it("prints help for --help", async () => {
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (value?: unknown) => {
      output.push(String(value ?? ""));
    };
    try {
      await codeIntelCommand(["--help"]);
    } finally {
      console.log = originalLog;
    }
    assert.equal(output.some((line) => line.includes("Usage: omx code-intel")), true);
  });
});
