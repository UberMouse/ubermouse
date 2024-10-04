import { transformCode } from "./index.js";

describe("transformCode", () => {
  it("outputs the same input when no operations are applied", async () => {
    const code = "const a = 1;";
    const config = {};

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toBe("const a = 1;");
  });

  it("can handle JSX", async () => {
    const code = "<div>Hello</div>";
    const config = {};

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`"<div>Hello</div>"`);
  });

  it("renames a simple symbol in an import with no references", async () => {
    const code = "import { a } from 'b';";
    const config = {
      rename: [{ from: "a", to: "c", importTarget: "b" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`"import { c } from 'b';"`);
  });

  it("renames a symbol with references", async () => {
    const code = "import { a } from 'b'; const b = a + 1;";
    const config = {
      rename: [{ from: "a", to: "c", importTarget: "b" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(
      `"import { c } from 'b';const b = c + 1;"`
    );
  });

  it("renames symbols correctly when the symbol is shadowed", async () => {
    const code = `
      import { a } from 'b';
      
      function foo() {
        const a = 1;
        const b = a + 1;
        return b;
      }
      
      console.log(a, foo());
    `;
    const config = {
      rename: [{ from: "a", to: "c", importTarget: "b" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "
      import { c } from 'b';

      function foo() {
        const a = 1;
        const b = a + 1;
        return b;
      }

      console.log(c, foo());"
    `);
  });

  it("handles multiple rename operations", async () => {
    const code = `
      import { a } from 'b';
      import { d } from 'e';
      import { f } from 'g';
      const b = a + d;
    `;
    const config = {
      rename: [
        { from: "a", to: "c", importTarget: "b" },
        { from: "d", to: "g", importTarget: "e" },
      ],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "
      import { c } from 'b';
      import { g } from 'e';
      import { f } from 'g';
      const b = c + g;"
    `);
  });
});

describe("MoveOperation", () => {
  it("moves a symbol to a new import when the target import doesn't exist", async () => {
    const code = `
      import { y, z } from "foo";
    `;
    const config = {
      move: [{ target: "y", to: "baz", importTarget: "foo" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "import { y } from \\"baz\\";
      import { z } from \\"foo\\";"
    `);
  });

  it("moves a symbol to an existing import", async () => {
    const code = `
      import { y, z } from "foo";
      import { x } from "baz";
    `;
    const config = {
      move: [{ target: "y", to: "baz", importTarget: "foo" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "
      import { z } from \\"foo\\";
      import { x, y } from \\"baz\\";"
    `);
  });

  it("handles multiple move operations", async () => {
    const code = `
      import { a, b, c } from "foo";
      import { x } from "bar";
      import { y } from "baz";
    `;
    const config = {
      move: [
        { target: "a", to: "bar", importTarget: "foo" },
        { target: "b", to: "baz", importTarget: "foo" },
      ],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "
      import { c } from \\"foo\\";
      import { x, a } from \\"bar\\";
      import { y, b } from \\"baz\\";"
    `);
  });

  it("handles move and rename operations together", async () => {
    const code = `
      import { a, b } from "foo";
      import { x } from "bar";
    `;
    const config = {
      move: [{ target: "a", to: "bar", importTarget: "foo" }],
      rename: [{ from: "b", to: "c", importTarget: "foo" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "
      import { c } from \\"foo\\";
      import { x, a } from \\"bar\\";"
    `);
  });

  it("handles a move operation that is also renamed where the symbol is not referenced", async () => {
    const code = `
      import { a, b } from "foo";
      import { x } from "bar";
    `;
    const config = {
      move: [{ target: "a", to: "bar", importTarget: "foo" }],
      rename: [{ from: "a", to: "y", importTarget: "foo" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "
      import { b } from \\"foo\\";
      import { x, y } from \\"bar\\";"
    `);
  });

  it("handles a move operation for a symbol that is also renamed, and the symbol is referenced", async () => {
    const code = `
      import { b } from "@test/source";
      
      const a: number = b + 1;
      
      export { a as b };
    `;
    const config = {
      move: [{ target: "b", to: "bar", importTarget: "@test/source" }],
      rename: [{ from: "b", to: "y", importTarget: "@test/source" }],
    };

    const transformedCode = await transformCode(code, config);

    expect(transformedCode).toMatchInlineSnapshot(`
      "import { y } from \\"bar\\";


      const a: number = y + 1;

      export { a as b };"
    `);
  });
});
