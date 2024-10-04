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
   * Where the symbol is imported from
   *
   * in `import { x } from "y"; "y" would be the importTarget
   */
  importTarget: string;
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

  function markDirty(): void {
    dirty = true;
  }

  const renameMap = new Map(
    (config.rename || []).map(({ from, to, importTarget }) => [
      `${importTarget}:${from}`,
      { to, renamed: false },
    ]),
  );

  const moveMap = new Map(
    (config.move || []).map(({ target, to, importTarget }) => [
      `${importTarget}:${target}`,
      { to, moved: false },
    ]),
  );

  const movedSpecifiers = new Map<string, t.ImportSpecifier[]>();

  traverse.default(ast, {
    ImportDeclaration(path) {
      const importTarget = path.node.source.value;
      const newSpecifiers: t.ImportSpecifier[] = [];

      path.node.specifiers.forEach((specifier) => {
        if (
          !t.isImportSpecifier(specifier) ||
          !t.isIdentifier(specifier.imported)
        ) {
          newSpecifiers.push(specifier as t.ImportSpecifier);
          return;
        }

        const importedName = specifier.imported.name;
        const key = `${importTarget}:${importedName}`;
        const renameInfo = renameMap.get(key);
        const moveInfo = moveMap.get(key);

        let newName = importedName;
        if (renameInfo) {
          newName = renameInfo.to;
          renameInfo.renamed = true;
        }

        if (moveInfo) {
          const movedSpecifier = t.importSpecifier(
            t.identifier(newName),
            t.identifier(newName),
          );

          if (movedSpecifiers.has(moveInfo.to)) {
            movedSpecifiers.get(moveInfo.to)!.push(movedSpecifier);
          } else {
            movedSpecifiers.set(moveInfo.to, [movedSpecifier]);
          }

          moveInfo.moved = true;
          markDirty();
        } else {
          specifier.imported.name = newName;
          specifier.local.name = newName;
          newSpecifiers.push(specifier);
        }

        if (renameInfo) {
          path.scope.rename(importedName, newName);
          markDirty();
        }
      });

      if (newSpecifiers.length === 0) {
        path.remove();
      } else {
        path.node.specifiers = newSpecifiers;
      }
    },
    Program: {
      exit(path) {
        const importDeclarations = path.node.body.filter(
          (node): node is t.ImportDeclaration => t.isImportDeclaration(node),
        );

        movedSpecifiers.forEach((specifiers, importPath) => {
          const existingImport = importDeclarations.find(
            (decl) => decl.source.value === importPath,
          );

          if (existingImport) {
            existingImport.specifiers.push(...specifiers);
          } else {
            const newImport = t.importDeclaration(
              specifiers,
              t.stringLiteral(importPath),
            );
            path.node.body.unshift(newImport);
          }
        });
      },
    },
  });

  if (!dirty) {
    return code;
  }

  const output = generate.default(ast, { retainLines: true }, code);

  return output.code;
}
