const os = require("node:os");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const vscode = require("vscode");

function activate(context) {
  let disposable = vscode.commands.registerCommand("fzf", async function () {
    const tempDir = await mkdtemp("/tmp/");
    const tempPath = `${tempDir}/fzf.out`;

    const terminal = vscode.window.createTerminal({
      hideFromUser: true,
      name: "fzf",
      shellPath: "zsh",
      shellArgs: [
        "-c",
        `pwd > ${tempPath} && rg --line-number --no-heading --color=always -g '!yarn.lock' '' | fzf --ansi --print0 --delimiter : --preview 'batcat --style=numbers --color=always --highlight-line {2} {1}' --preview-window +{2}-/2 >> ${tempPath}`,
      ],
    });

    terminal.show();

    const listener = vscode.window.onDidChangeActiveTerminal(async () => {
      if (terminal.exitStatus !== undefined) {
        vscode.commands.executeCommand("workbench.action.closePanel");

        const lines = (await readFile(tempPath, "utf8")).split("\n");
        listener.dispose();
        await rm(tempDir, { recursive: true });

        if (!lines[1]) {
          // I.e. ctrl-c or similar
          return;
        }

        const pwd = lines[0];
        const parts = lines[1].split(":");
        const filePath = `${pwd}/${parts[0]}`;
        const lineNumber = parseInt(parts[1]);

        const editor = await vscode.window.showTextDocument(
          vscode.Uri.file(filePath)
        );
        const line = editor.document.lineAt(lineNumber - 1);
        const column = line.firstNonWhitespaceCharacterIndex;
        editor.selection = new vscode.Selection(
          lineNumber - 1,
          column,
          lineNumber - 1,
          column
        );
        editor.revealRange(line.range);
      }
    });
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
