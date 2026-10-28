// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The GitHub sign-in of the user ([R-GEN-006](../docs/requirements.md#r-gen-006)).
 * The author of every new note and every new answer is the GitHub login of
 * the signed-in user, so that the author is always known. The extension uses
 * the GitHub authentication of VS Code: VS Code asks the user once whether
 * the extension may use the GitHub account, and keeps the session. The
 * extension reads only the name of the account, which is the GitHub login; it
 * sends no request to GitHub itself.
 */

import * as vscode from 'vscode';

/** githubProvider is the identifier of the GitHub authentication of VS Code. */
export const githubProvider = 'github';

/** githubScopes are the scopes of the session: reading the profile of the user, which names the login. */
export const githubScopes = ['read:user'];

/**
 * githubLogin returns the GitHub login of the user, or undefined without a sign-in.
 * @param signIn - Whether VS Code asks the user to sign in when no session exists; otherwise nothing shows.
 */
export async function githubLogin(signIn: boolean): Promise<string | undefined> {
  try {
    const session = await vscode.authentication.getSession(githubProvider, githubScopes, signIn ? { createIfNone: true } : { silent: true });
    return session?.account.label || undefined;
  } catch {
    // The user cancelled the sign-in, or VS Code has no GitHub authentication.
    return undefined;
  }
}
