/**
 * Codemod: Transform useState to createSignal
 *
 * React:  const [value, setValue] = useState(initial);
 * Solid:  const [value, setValue] = createSignal(initial);
 *
 * Also transforms usage:
 * React:  value (direct access)
 * Solid:  value() (function call)
 *
 * Usage: npx jscodeshift -t scripts/codemods/useState-to-createSignal.ts src/**\/*.tsx
 */

import type { FileInfo, API, Options } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Track signal getters for later transformation
  const signalGetters = new Set<string>();

  // 1. Transform useState calls to createSignal
  root
    .find(j.CallExpression, {
      callee: { name: 'useState' },
    })
    .forEach((path) => {
      // Change function name
      if (path.node.callee.type === 'Identifier') {
        path.node.callee.name = 'createSignal';
        hasChanges = true;
      }

      // Find the variable declaration to track the getter name
      const parent = path.parentPath;
      if (parent && parent.node.type === 'VariableDeclarator') {
        const id = parent.node.id;
        if (id.type === 'ArrayPattern' && id.elements.length >= 1) {
          const getter = id.elements[0];
          if (getter && getter.type === 'Identifier') {
            signalGetters.add(getter.name);
          }
        }
      }
    });

  // 2. Transform direct access to getter function calls
  // This is tricky and needs careful handling to avoid breaking setter calls
  signalGetters.forEach((getterName) => {
    // Find all identifier references that are NOT:
    // - The declaration itself
    // - Part of an array destructuring pattern
    // - Already a call expression
    // - The callee of a call expression (which would be the setter pattern)
    root
      .find(j.Identifier, { name: getterName })
      .forEach((path) => {
        const parent = path.parent;

        // Skip if it's the declaration
        if (parent.node.type === 'ArrayPattern') {
          return;
        }

        // Skip if it's already being called
        if (parent.node.type === 'CallExpression' && parent.node.callee === path.node) {
          return;
        }

        // Skip if it's in an import statement
        if (parent.node.type === 'ImportSpecifier' || parent.node.type === 'ImportDefaultSpecifier') {
          return;
        }

        // Skip if it's a property key
        if (parent.node.type === 'Property' && parent.node.key === path.node) {
          return;
        }

        // Skip if it's a member expression property (obj.value vs value.prop)
        if (parent.node.type === 'MemberExpression' && parent.node.property === path.node && !parent.node.computed) {
          return;
        }

        // Transform to function call
        j(path).replaceWith(
          j.callExpression(j.identifier(getterName), [])
        );
        hasChanges = true;
      });
  });

  // 3. Update import statement (if not already done by react-imports-to-solid)
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === 'react')
    .forEach((path) => {
      const specifiers = path.node.specifiers || [];
      specifiers.forEach((spec) => {
        if (spec.type === 'ImportSpecifier' &&
            spec.imported.type === 'Identifier' &&
            spec.imported.name === 'useState') {
          spec.imported.name = 'createSignal';
          if (spec.local && spec.local.type === 'Identifier') {
            spec.local.name = 'createSignal';
          }
          hasChanges = true;
        }
      });
    });

  return hasChanges ? root.toSource({ quote: 'single' }) : null;
}
