// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The text of a file that a test imports with `?raw`, as Vite gives it.
declare module '*?raw' {
  const text: string;
  export default text;
}
