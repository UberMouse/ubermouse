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

    expect(transformedCode).toMatchInlineSnapshot(`"<div>Hello</div>;"`);
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
      `"import { c } from 'b';const b = c + 1;"`,
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
