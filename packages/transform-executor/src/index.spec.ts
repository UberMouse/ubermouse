import { Volume } from "memfs";

import type { OperationConfig } from "@ubermouse/code-transform";

import { _transformFiles } from "./index.js";

function getTransformFiles(
  volume: InstanceType<typeof Volume>,
): ReturnType<typeof _transformFiles> {
  return _transformFiles(
    async (file) => volume.readFileSync(file).toString(),
    async (file, content) => volume.writeFileSync(file, content),
  );
}

describe("transformFiles", () => {
  it("should transform files", async () => {
    const volume = Volume.fromJSON({
      "/src/index.ts": `
        import { a } from "ad";
        export const c = a;
      `,
      "/src/a.ts": `
        export const a = 1;
      `,
    });
    const transformFiles = getTransformFiles(volume);

    const config: OperationConfig = {
      rename: [
        {
          from: "a",
          to: "b",
          importTarget: "ad",
        },
      ],
    };
    await transformFiles(["/src/index.ts"], config, {});

    expect(volume.toJSON()).toMatchInlineSnapshot(`
      Object {
        "/src/a.ts": "
              export const a = 1;
            ",
        "/src/index.ts": "
      import { b } from \\"ad\\";
      export const c = b;",
      }
    `);
  });
});
