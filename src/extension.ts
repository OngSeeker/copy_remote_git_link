// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
// 获取工作区hash值
function getCurrentBranchHash(repoPath: string): string | null {
    try {
        const result = cp.execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
        return result;
    } catch (e) {
        return null;
    }
}
// 获取当前行号
function getSelectedLines() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const selection = editor.selection;
        const startLine = selection.start.line + 1; // VS Code lines are zero-based
        const endLine = selection.end.line + 1;
        return { startLine, endLine };
    }
    return null;
}
// 获取远程仓库地址
function getRemoteUrl(repoPath: string): string | null {
    try {
        // 执行 git remote get-url origin 命令来获取远程仓库地址
        const result = cp.execSync('git remote get-url origin', { cwd: repoPath }).toString().trim();
        return result;
    } catch (e) {
        return null;
    }
}

function convertSshToHttps(sshUrl: string): string {
    // 正则表达式匹配SSH格式的URL
    const sshRegex = /^git@([^:]+):(.+).git$/;
    const matches = sshUrl.match(sshRegex);

    if (matches && matches.length === 3) {
        const domain = matches[1];
        let path = matches[2];

        // 移除可能存在的'.git'后缀
        if (path.endsWith('.git')) {
            path = path.substring(0, path.length - 4);
        }

        // 返回HTTPS格式的URL
        return `https://${domain}/${path}`;
    } else {
        // 如果输入不是SSH格式的URL，则直接返回原URL
        return sshUrl;
    }
}


function getRelativePath(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        // 没有激活的文本编辑器
        return undefined;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) {
        // 文件不在工作区内
        return undefined;
    }

    // 将文件的绝对路径转换为相对于工作区根目录的路径
    const relativePath = workspaceFolder.uri.fsPath 
        ? editor.document.uri.fsPath.replace(workspaceFolder.uri.fsPath, '').replace(/^\//, '') // 处理以斜杠开头的情况
        : editor.document.uri.path.replace(workspaceFolder.uri.path, '').replace(/^\//, ''); // 对于非Windows系统

    return relativePath;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const copyGiteeLink = vscode.commands.registerCommand('copy-gitee-remote-lint.copyGiteeLink', async () => {
		const selectedLines = getSelectedLines();
		if (!selectedLines) {
			vscode.window.showErrorMessage(vscode.l10n.t('error.noSelection'));
			return;
		}
		// 获取当前工作区路径
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage(vscode.l10n.t('error.noWorkspace'));
			return;
		}

		const relativePath = getRelativePath();

		const repoPath = workspaceFolder.uri.fsPath;
		const commitHash = getCurrentBranchHash(repoPath);
		const remoteUrl =convertSshToHttps(getRemoteUrl(repoPath) as any) ;

		if (commitHash) {
			  // 将文本复制到剪贴板
			  await vscode.env.clipboard.writeText(`${remoteUrl}/blob/${commitHash}${relativePath}#L${selectedLines.startLine}-L${selectedLines.endLine}`);
			  // 显示复制成功的消息
			  vscode.window.showInformationMessage(vscode.l10n.t('message.copiedSuccessfully', remoteUrl));
		} else {
			vscode.window.showErrorMessage(vscode.l10n.t('error.noCommitHash'));
		}
		
	});
	context.subscriptions.push(copyGiteeLink);
}

// This method is called when your extension is deactivated
export function deactivate() {}
