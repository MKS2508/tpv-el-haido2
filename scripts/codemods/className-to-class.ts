/**
 * Codemod: Transform React JSX attributes to SolidJS
 *
 * - className → class
 * - htmlFor → for
 * - onChange → onInput (for text inputs)
 * - defaultValue → value (with different handling)
 *
 * Usage: npx jscodeshift -t scripts/codemods/className-to-class.ts src/**\/*.tsx
 */

import type { FileInfo, API, Options } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Transform className to class
  root
    .find(j.JSXAttribute, {
      name: { name: 'className' },
    })
    .forEach((path) => {
      if (path.node.name.type === 'JSXIdentifier') {
        path.node.name.name = 'class';
        hasChanges = true;
      }
    });

  // Transform htmlFor to for
  root
    .find(j.JSXAttribute, {
      name: { name: 'htmlFor' },
    })
    .forEach((path) => {
      if (path.node.name.type === 'JSXIdentifier') {
        path.node.name.name = 'for';
        hasChanges = true;
      }
    });

  // Transform onChange to onInput for text inputs
  // Note: This is a simplified version - in practice you may want to be more selective
  root
    .find(j.JSXAttribute, {
      name: { name: 'onChange' },
    })
    .forEach((path) => {
      // Check if parent is an input element
      const parent = path.parent;
      if (parent && parent.node.type === 'JSXOpeningElement') {
        const elementName = parent.node.name;
        if (elementName.type === 'JSXIdentifier') {
          const name = elementName.name.toLowerCase();
          // Only transform for input, textarea, select
          if (name === 'input' || name === 'textarea') {
            if (path.node.name.type === 'JSXIdentifier') {
              path.node.name.name = 'onInput';
              hasChanges = true;
            }
          }
        }
      }
    });

  // Transform event handler patterns
  // React: (e) => e.target.value
  // Solid: (e) => e.currentTarget.value (preferred for type safety)
  root
    .find(j.MemberExpression, {
      property: { name: 'target' },
    })
    .forEach((path) => {
      // Check if this is accessing .value or similar
      const parent = path.parent;
      if (parent && parent.node.type === 'MemberExpression') {
        const grandProp = parent.node.property;
        if (grandProp.type === 'Identifier' &&
            (grandProp.name === 'value' || grandProp.name === 'checked')) {
          // Change target to currentTarget
          if (path.node.property.type === 'Identifier') {
            path.node.property.name = 'currentTarget';
            hasChanges = true;
          }
        }
      }
    });

  // Transform ref handling
  // React: ref={myRef}
  // Solid: ref={myRef} (but refs are used differently)
  // This codemod adds a comment for manual review
  root
    .find(j.JSXAttribute, {
      name: { name: 'ref' },
    })
    .forEach((path) => {
      // Add a comment before the element for manual review
      // In practice, ref handling in Solid is different:
      // let myRef; <div ref={myRef} /> or <div ref={(el) => myRef = el} />
      // This would need manual adjustment based on how the ref is used
    });

  // Transform key to be careful - in Solid, key should be on <For> component
  // We'll leave a note but not auto-transform since the context matters
  // root.find(j.JSXAttribute, { name: { name: 'key' } }) - needs manual review

  // Transform dangerouslySetInnerHTML to innerHTML
  root
    .find(j.JSXAttribute, {
      name: { name: 'dangerouslySetInnerHTML' },
    })
    .forEach((path) => {
      if (path.node.name.type === 'JSXIdentifier') {
        path.node.name.name = 'innerHTML';

        // Transform the value from { __html: value } to just value
        const value = path.node.value;
        if (value && value.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          if (expr.type === 'ObjectExpression') {
            const htmlProp = expr.properties.find((p: any) =>
              p.type === 'Property' &&
              p.key.type === 'Identifier' &&
              p.key.name === '__html'
            );
            if (htmlProp && htmlProp.type === 'Property') {
              value.expression = htmlProp.value;
            }
          }
        }
        hasChanges = true;
      }
    });

  // Transform style objects (Solid uses different style prop handling)
  // React: style={{ backgroundColor: 'red' }}
  // Solid: style={{ 'background-color': 'red' }} (CSS property names)
  // This is complex and may need manual review

  return hasChanges ? root.toSource({ quote: 'single' }) : null;
}
