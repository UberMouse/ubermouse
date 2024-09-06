import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

interface RenameOperation {
  /**
   * The current name of the symbol
   */
  from: string;
  /**
   * The desired name of the symbol
   */
  to: string;
  /**
   * Value of the import to search for the symbol
   */
  importTarget: string;
}

interface MoveOperation {
  /**
   * The name of the symbol to move
   */
  target: string;
  /**
   * The new import path for the symbol
   */
  to: string;
  /**
   * Optional extra path appended to the original imports package name to target a deep import
   */
  path?: string;
}

export interface OperationConfig {
  rename?: RenameOperation[];
  move?: MoveOperation[];
}

/**
 * Accepts the source code of a typescript file and a config object describing the transformations to apply.
 *
 * The code is run through prettier before being returned
 *
 * @param code - The code to transform
 * @param config - The transformation configuration
 * @returns - The transformed code
 */
export async function transformCode(
  code: string,
  config: OperationConfig,
): Promise<string> {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  let dirty = false;

  function markDirty() {
    dirty = true;
  }

  if (config.rename && config.rename.length > 0) {
    const renameMap = new Map(
      config.rename.map(({ from, to, importTarget }) => [
        `${importTarget}:${from}`,
        { to, renamed: false },
      ]),
    );

    // First pass: Rename imports
    traverse.default(ast, {
      ImportDeclaration(path) {
        const importTarget = path.node.source.value;
        path.node.specifiers.forEach((specifier) => {
          if (
            t.isImportSpecifier(specifier) &&
            t.isIdentifier(specifier.imported)
          ) {
            const key = `${importTarget}:${specifier.imported.name}`;
            const renameInfo = renameMap.get(key);
            if (renameInfo) {
              specifier.imported.name = renameInfo.to;
              specifier.local.name = renameInfo.to;
              renameInfo.renamed = true;
              markDirty();
            }
          }
        });
      },
    });

    // Second pass: Rename references
    traverse.default(ast, {
      Program(path) {
        renameMap.forEach((renameInfo, key) => {
          if (renameInfo.renamed) {
            const [, from] = key.split(":");
            path.scope.rename(from, renameInfo.to);
          }
        });
      },
    });
  }

  if (!dirty) {
    return code;
  }

  const output = generate.default(ast, { retainLines: true }, code);

  return output.code;
}
