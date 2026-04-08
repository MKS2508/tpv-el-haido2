/**
 * Codemod: Transform useEffect to createEffect
 *
 * React:  useEffect(() => { ... }, [deps]);
 * Solid:  createEffect(() => { ... });  // deps are auto-tracked
 *
 * Note: SolidJS createEffect doesn't use dependency arrays.
 * Dependencies are automatically tracked based on signal access.
 *
 * For cleanup patterns, use onCleanup:
 * React:  useEffect(() => { return () => cleanup(); }, []);
 * Solid:  createEffect(() => { onCleanup(() => cleanup()); });
 *
 * Usage: npx jscodeshift -t scripts/codemods/useEffect-to-createEffect.ts src/**\/*.tsx
 */

import type { FileInfo, API, Options } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;
  let needsOnCleanup = false;
  let needsOnMount = false;

  // Transform useEffect calls
  root
    .find(j.CallExpression, {
      callee: { name: 'useEffect' },
    })
    .forEach((path) => {
      const args = path.node.arguments;

      if (args.length === 0) return;

      const callback = args[0];
      const deps = args.length > 1 ? args[1] : null;

      // Check if this is a mount-only effect (empty deps array)
      const isEmptyDeps = deps &&
        deps.type === 'ArrayExpression' &&
        deps.elements.length === 0;

      // Check if callback has a return statement (cleanup)
      let hasCleanup = false;
      if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
        const body = callback.body;
        if (body.type === 'BlockStatement') {
          body.body.forEach((stmt) => {
            if (stmt.type === 'ReturnStatement' && stmt.argument) {
              hasCleanup = true;
            }
          });
        }
      }

      // Transform based on pattern
      if (isEmptyDeps) {
        // Mount-only effect → onMount
        if (path.node.callee.type === 'Identifier') {
          path.node.callee.name = 'onMount';
          needsOnMount = true;
        }
        // Remove deps array
        path.node.arguments = [callback];

        // Handle cleanup inside onMount
        if (hasCleanup && (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')) {
          transformCleanupInCallback(j, callback);
          needsOnCleanup = true;
        }
      } else {
        // Regular effect → createEffect
        if (path.node.callee.type === 'Identifier') {
          path.node.callee.name = 'createEffect';
        }
        // Remove deps array (Solid auto-tracks)
        path.node.arguments = [callback];

        // Transform cleanup pattern
        if (hasCleanup && (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')) {
          transformCleanupInCallback(j, callback);
          needsOnCleanup = true;
        }
      }

      hasChanges = true;
    });

  // Transform useLayoutEffect to createEffect (Solid doesn't distinguish)
  root
    .find(j.CallExpression, {
      callee: { name: 'useLayoutEffect' },
    })
    .forEach((path) => {
      if (path.node.callee.type === 'Identifier') {
        path.node.callee.name = 'createEffect';
      }
      // Remove deps array
      if (path.node.arguments.length > 1) {
        path.node.arguments = [path.node.arguments[0]];
      }
      hasChanges = true;
    });

  // Update imports
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === 'solid-js')
    .forEach((path) => {
      const specifiers = path.node.specifiers || [];
      const existingNames = new Set(
        specifiers
          .filter((s): s is any => s.type === 'ImportSpecifier')
          .map((s) => s.imported.name)
      );

      // Add onCleanup if needed
      if (needsOnCleanup && !existingNames.has('onCleanup')) {
        specifiers.push(j.importSpecifier(j.identifier('onCleanup')));
        hasChanges = true;
      }

      // Add onMount if needed
      if (needsOnMount && !existingNames.has('onMount')) {
        specifiers.push(j.importSpecifier(j.identifier('onMount')));
        hasChanges = true;
      }
    });

  // Also update React imports that haven't been transformed yet
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === 'react')
    .forEach((path) => {
      const specifiers = path.node.specifiers || [];
      specifiers.forEach((spec) => {
        if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
          if (spec.imported.name === 'useEffect') {
            spec.imported.name = 'createEffect';
            if (spec.local && spec.local.type === 'Identifier') {
              spec.local.name = 'createEffect';
            }
            hasChanges = true;
          }
          if (spec.imported.name === 'useLayoutEffect') {
            spec.imported.name = 'createEffect';
            if (spec.local && spec.local.type === 'Identifier') {
              spec.local.name = 'createEffect';
            }
            hasChanges = true;
          }
        }
      });
    });

  return hasChanges ? root.toSource({ quote: 'single' }) : null;
}

/**
 * Transform cleanup return statements to onCleanup calls
 *
 * Before:
 *   () => {
 *     // setup
 *     return () => cleanup();
 *   }
 *
 * After:
 *   () => {
 *     // setup
 *     onCleanup(() => cleanup());
 *   }
 */
function transformCleanupInCallback(j: any, callback: any) {
  if (callback.body.type !== 'BlockStatement') return;

  const body = callback.body.body;
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      // Replace return with onCleanup call
      body[i] = j.expressionStatement(
        j.callExpression(j.identifier('onCleanup'), [stmt.argument])
      );
    }
  }
}
