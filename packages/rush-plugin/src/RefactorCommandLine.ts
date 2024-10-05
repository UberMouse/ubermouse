import {
  CommandLineParser,
  type CommandLineFlagParameter,
  type CommandLineStringListParameter,
  type CommandLineStringParameter,
} from "@rushstack/ts-command-line";
import term from "terminal-kit";

import { execute } from "./engine.js";

const { terminal } = term;

export class RefactorCommandLine extends CommandLineParser {
  private _verbose: CommandLineFlagParameter;
  private _fromPackage: CommandLineStringParameter;
  private _renameSymbols: CommandLineStringListParameter;
  private _moveSymbols: CommandLineStringListParameter;

  public constructor() {
    super({
      toolFilename: "refactor",
      toolDescription:
        'The "refactor" tool lets you rename and move symbols across your codebase exported by a specific package',
    });
  }

  protected onDefineParameters(): void {
    this._verbose = this.defineFlagParameter({
      parameterLongName: "--verbose",
      parameterShortName: "-v",
      description: "Show extra logging detail",
    });

    this._fromPackage = this.defineStringParameter({
      parameterLongName: "--from",
      parameterShortName: "-f",
      argumentName: "FROM_PACKAGE",
      environmentVariable: "FROM_PACKAGE",
      description: "The package to rename symbols from",
      required: true,
    });

    this._renameSymbols = this.defineStringListParameter({
      parameterLongName: "--rename",
      parameterShortName: "-r",
      argumentName: "SYMBOL_RENAME",
      description:
        "The rename symbol configuration in the format of 'from,to' case-sensitive",
    });

    this._moveSymbols = this.defineStringListParameter({
      parameterLongName: "--move",
      parameterShortName: "-m",
      argumentName: "SYMBOL_MOVE",
      description:
        "The move symbol configuration in the format of 'symbol,targetPackage[,subpath]' case-sensitive",
    });
  }

  protected async onExecute(): Promise<void> {
    const progressBar = terminal.progressBar({
      percent: true,
      eta: true,
    });

    const renameConfig = this._renameSymbols.values.map((value) => {
      const [from, to] = value.split(",");
      return { from, to, importTarget: this._fromPackage.value! };
    });

    const moveConfig = this._moveSymbols.values.map((value) => {
      const [target, to, subpath = ""] = value.split(",");
      return {
        target,
        to,
        importTarget: subpath
          ? `${this._fromPackage.value!}/${subpath}`
          : this._fromPackage.value!,
      };
    });

    await execute({
      sourcePackageName: this._fromPackage.value!,
      config: {
        rename: renameConfig,
        move: moveConfig,
      },
      hooks: {
        onStart: (fileCount): void => {
          terminal(
            `Starting refactoring of exported symbols from ${this._fromPackage.value!}\n`,
          );
          progressBar.update({ progress: 0, items: fileCount });
        },
        onFileComplete(file) {
          progressBar.itemDone(file);
        },
      },
    });

    terminal.green.bold("\nRefactoring complete\n");

    process.exit(0);
  }
}
