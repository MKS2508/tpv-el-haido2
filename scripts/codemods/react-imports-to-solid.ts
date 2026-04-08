/**
 * Codemod: Transform React imports to SolidJS
 *
 * Usage: npx jscodeshift -t scripts/codemods/react-imports-to-solid.ts src/**\/*.tsx
 */

import type { FileInfo, API, Options } from 'jscodeshift';

const REACT_TO_SOLID_IMPORTS: Record<string, { module: string; name: string }> = {
  // Core React → solid-js
  'useState': { module: 'solid-js', name: 'createSignal' },
  'useEffect': { module: 'solid-js', name: 'createEffect' },
  'useMemo': { module: 'solid-js', name: 'createMemo' },
  'useCallback': { module: 'solid-js', name: 'createMemo' }, // or remove entirely
  'useRef': { module: 'solid-js', name: 'createSignal' }, // refs work differently
  'useContext': { module: 'solid-js', name: 'useContext' },
  'createContext': { module: 'solid-js', name: 'createContext' },
  'lazy': { module: 'solid-js', name: 'lazy' },
  'Suspense': { module: 'solid-js', name: 'Suspense' },
  'Fragment': { module: 'solid-js', name: 'Fragment' },

  // React types (remove or comment out)
  'FC': { module: '', name: '' },
  'ReactNode': { module: 'solid-js', name: 'JSX.Element' },
  'ReactElement': { module: 'solid-js', name: 'JSX.Element' },
  'ComponentProps': { module: 'solid-js', name: 'ComponentProps' },
};

const FRAMER_TO_MOTION: Record<string, { module: string; name: string }> = {
  'motion': { module: '@motionone/solid', name: 'Motion' },
  'AnimatePresence': { module: '@motionone/solid', name: 'Presence' },
};

const LUCIDE_TRANSFORM = {
  from: 'lucide-react',
  to: 'lucide-solid',
};

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Track which solid-js imports we need to add
  const solidImports = new Set<string>();
  const motionImports = new Set<string>();

  // 1. Transform React imports
  root
    .find(j.ImportDeclaration)
    .filter((path) => {
      const source = path.node.source.value;
      return source === 'react' || source === 'react-dom';
    })
    .forEach((path) => {
      const specifiers = path.node.specifiers || [];
      const newSpecifiers: any[] = [];

      specifiers.forEach((spec) => {
        if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
          const name = spec.imported.name;
          const mapping = REACT_TO_SOLID_IMPORTS[name];

          if (mapping && mapping.module === 'solid-js') {
            solidImports.add(mapping.name);
          } else if (!mapping) {
            // Keep unknown imports with a TODO comment
            newSpecifiers.push(spec);
          }
          // Empty module means remove the import
        } else if (spec.type === 'ImportDefaultSpecifier') {
          // Remove default React import
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          // Remove namespace import (import * as React)
        }
      });

      if (newSpecifiers.length === 0) {
        j(path).remove();
        hasChanges = true;
      }
    });

  // 2. Transform react-dom/client to solid-js/web
  root
    .find(j.ImportDeclaration)
    .filter((path) => {
      const source = path.node.source.value;
      return source === 'react-dom/client' || source === 'react-dom';
    })
    .forEach((path) => {
      path.node.source.value = 'solid-js/web';

      // Transform createRoot → render
      const specifiers = path.node.specifiers || [];
      specifiers.forEach((spec) => {
        if (spec.type === 'ImportSpecifier' &&
            spec.imported.type === 'Identifier' &&
            spec.imported.name === 'createRoot') {
          spec.imported.name = 'render';
          if (spec.local && spec.local.type === 'Identifier') {
            spec.local.name = 'render';
          }
        }
      });
      hasChanges = true;
    });

  // 3. Transform framer-motion to @motionone/solid
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === 'framer-motion')
    .forEach((path) => {
      path.node.source.value = '@motionone/solid';

      const specifiers = path.node.specifiers || [];
      specifiers.forEach((spec) => {
        if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
          const mapping = FRAMER_TO_MOTION[spec.imported.name];
          if (mapping) {
            spec.imported.name = mapping.name;
            if (spec.local && spec.local.type === 'Identifier' &&
                spec.local.name === spec.imported.name) {
              spec.local.name = mapping.name;
            }
          }
        }
      });
      hasChanges = true;
    });

  // 4. Transform lucide-react to lucide-solid
  root
    .find(j.ImportDeclaration)
    .filter((path) => path.node.source.value === LUCIDE_TRANSFORM.from)
    .forEach((path) => {
      path.node.source.value = LUCIDE_TRANSFORM.to;
      hasChanges = true;
    });

  // 5. Add solid-js imports at the top if needed
  if (solidImports.size > 0) {
    const existingSolidImport = root
      .find(j.ImportDeclaration)
      .filter((path) => path.node.source.value === 'solid-js')
      .at(0);

    if (existingSolidImport.size() > 0) {
      // Add to existing import
      const importDecl = existingSolidImport.get();
      const existingNames = new Set(
        (importDecl.node.specifiers || [])
          .filter((s: any) => s.type === 'ImportSpecifier')
          .map((s: any) => s.imported.name)
      );

      solidImports.forEach((name) => {
        if (!existingNames.has(name)) {
          importDecl.node.specifiers.push(
            j.importSpecifier(j.identifier(name))
          );
        }
      });
    } else {
      // Create new import
      const importDecl = j.importDeclaration(
        Array.from(solidImports).map((name) =>
          j.importSpecifier(j.identifier(name))
        ),
        j.literal('solid-js')
      );

      // Insert at the top
      const firstImport = root.find(j.ImportDeclaration).at(0);
      if (firstImport.size() > 0) {
        firstImport.insertBefore(importDecl);
      } else {
        root.get().node.program.body.unshift(importDecl);
      }
    }
    hasChanges = true;
  }

  return hasChanges ? root.toSource({ quote: 'single' }) : null;
}
