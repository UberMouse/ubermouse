import { readFile } from "fs/promises";
import path from "path";

import { mapKeys } from "lodash-es";
import { vol, type DirectoryJSON } from "memfs";

import { execute } from "./engine.js";

function sanitizeVolume(json: DirectoryJSON): DirectoryJSON {
  return mapKeys(json, (_value, key) => key.slice(key.indexOf("/packages/")));
}

const fsOverrides: Parameters<typeof execute>[0]["fsOverrides"] = [
  async (file) => readFile(file, "utf8"),
  async (file, content) => {
    vol.mkdirSync(path.dirname(file), { recursive: true });

    return vol.writeFileSync(file, content);
  },
];

describe("engine", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should work", async () => {
    await execute({
      sourcePackageName: "@test/source",
      operations: {},
      fsOverrides,
    });

    expect(sanitizeVolume(vol.toJSON())).toMatchInlineSnapshot(`
      Object {
        "/packages/integration-test-projects/consumer-a/src/b.ts": "import { b } from \\"@test/source\\";

      const a: number = b + 1;

      export { a as b };",
        "/packages/integration-test-projects/consumer-a/src/ignored.ts": "export const ignored: number = 1;",
        "/packages/integration-test-projects/consumer-a/src/index.ts": "import { a } from \\"@test/source\\";

      import { b } from \\"./b.js\\";
      import { ignored } from \\"./ignored.js\\";

      const c: number = a + b;

      export { c, ignored };",
        "/packages/integration-test-projects/consumer-b/src/a.ts": "import { a } from \\"@test/source\\";

      const b: number = a + 1;

      export { b as a };",
        "/packages/integration-test-projects/consumer-b/src/index.ts": "import { b } from \\"@test/source\\";

      import { a } from \\"./a.js\\";

      const c: number = a + b;

      export { c };",
      }
    `);
  });

  it("performs rename operations", async () => {
    await execute({
      sourcePackageName: "@test/source",
      operations: {
        rename: [
          {
            from: "a",
            to: "z",
            importTarget: "@test/source",
          },
        ],
      },
      fsOverrides,
    });

    expect(sanitizeVolume(vol.toJSON())).toMatchInlineSnapshot(`
      Object {
        "/packages/integration-test-projects/consumer-a/src/b.ts": "import { b } from \\"@test/source\\";

      const a: number = b + 1;

      export { a as b };",
        "/packages/integration-test-projects/consumer-a/src/ignored.ts": "export const ignored: number = 1;",
        "/packages/integration-test-projects/consumer-a/src/index.ts": "import { z } from \\"@test/source\\";

      import { b } from \\"./b.js\\";
      import { ignored } from \\"./ignored.js\\";

      const c: number = z + b;

      export { c, ignored };",
        "/packages/integration-test-projects/consumer-b/src/a.ts": "import { z } from \\"@test/source\\";

      const b: number = z + 1;

      export { b as a };",
        "/packages/integration-test-projects/consumer-b/src/index.ts": "import { b } from \\"@test/source\\";

      import { a } from \\"./a.js\\";

      const c: number = a + b;

      export { c };",
      }
    `);
  });
});
