'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@mks2508/theme-manager-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CSSVariable {
  name: string;
  value: string;
  computed: string;
}

const THEME_VARS = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--popover',
  '--popover-foreground',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--success',
  '--warning',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
];

export function ThemeDebugger() {
  const { currentTheme, currentMode, themes, initialized, loading, error } = useTheme();
  const [cssVariables, setCssVariables] = useState<CSSVariable[]>([]);
  const [domInfo, setDomInfo] = useState({
    dataTheme: '',
    darkClass: false,
    htmlClasses: '',
  });

  const [copyStatus, setCopyStatus] = useState('');

  const refreshDebugInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Get DOM info
    const html = document.documentElement;
    const dataTheme = html.getAttribute('data-theme') || 'none';
    const darkClass = html.classList.contains('dark');
    const htmlClasses = html.className;

    setDomInfo({
      dataTheme,
      darkClass,
      htmlClasses,
    });

    // Get CSS variables
    const computedStyle = window.getComputedStyle(html);
    const variables: CSSVariable[] = [];

    THEME_VARS.forEach((varName) => {
      const value = computedStyle.getPropertyValue(varName).trim();
      // Try to get the raw value from CSS
      const rawValue = html.style.getPropertyValue(varName) || 'inherited';

      variables.push({
        name: varName,
        value: rawValue,
        computed: value || 'undefined',
      });
    });

    setCssVariables(variables);
  }, []);

  const handleCopyAll = () => {
    const textToCopy = cssVariables.map((v) => `${v.name}: ${v.computed}`).join('\n');
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus(''), 2000);
      })
      .catch(() => {
        setCopyStatus('Failed to copy!');
        setTimeout(() => setCopyStatus(''), 2000);
      });
  };

  useEffect(() => {
    refreshDebugInfo();

    // Refresh on theme changes
    const interval = setInterval(refreshDebugInfo, 1000);

    return () => clearInterval(interval);
  }, [refreshDebugInfo]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Theme Debugger
          <div className="flex gap-2">
            <Button onClick={refreshDebugInfo} size="sm" variant="outline">
              Refresh
            </Button>
            <Button onClick={handleCopyAll} size="sm" variant="outline">
              Copy All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Theme State Info */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm font-medium">Theme:</div>
            <Badge variant="outline">{currentTheme}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Mode:</div>
            <Badge variant="outline">{currentMode}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Initialized:</div>
            <Badge variant={initialized ? 'default' : 'destructive'}>
              {initialized ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Loading:</div>
            <Badge variant={loading ? 'secondary' : 'outline'}>{loading ? 'Yes' : 'No'}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Themes:</div>
            <Badge variant="outline">{themes?.length || 0}</Badge>
          </div>
        </div>

        {error && (
          <div className="border border-destructive rounded p-3 bg-destructive/10">
            <div className="text-sm font-medium text-destructive">Error: {error}</div>
          </div>
        )}

        {/* DOM State Info */}
        <div className="border rounded p-3 bg-muted/50">
          <div className="text-sm font-medium mb-2">DOM State:</div>
          <div className="space-y-1 text-xs font-mono">
            <div>
              data-theme: <span className="bg-primary/10 px-1 rounded">{domInfo.dataTheme}</span>
            </div>
            <div>
              dark class:{' '}
              <span className="bg-primary/10 px-1 rounded">{domInfo.darkClass.toString()}</span>
            </div>
            <div>
              html classes:{' '}
              <span className="bg-primary/10 px-1 rounded">{domInfo.htmlClasses || 'none'}</span>
            </div>
          </div>
        </div>

        {/* CSS Variables Table */}
        <div>
          <div className="text-sm font-medium mb-2">
            CSS Variables:{' '}
            {copyStatus && <span className="text-green-500 text-xs ml-2">{copyStatus}</span>}
          </div>
          <div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto">
            <div className="bg-muted p-2 grid grid-cols-3 gap-2 text-xs font-medium sticky top-0">
              <div>Variable</div>
              <div>Computed Value</div>
              <div>Preview</div>
            </div>
            <div className="divide-y">
              {cssVariables.map((variable) => (
                <div key={variable.name} className="p-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="font-mono">{variable.name}</div>
                  <div className="font-mono break-all">{variable.computed || 'undefined'}</div>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-4 h-4 border rounded"
                      style={{ backgroundColor: variable.computed }}
                      title={variable.computed}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Test Colors Preview */}
        <div>
          <div className="text-sm font-medium mb-2">Theme Test Colors:</div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-background border mx-auto mb-1"></div>
              <div className="text-[10px]">bg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-primary border mx-auto mb-1"></div>
              <div className="text-[10px]">primary</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-secondary border mx-auto mb-1"></div>
              <div className="text-[10px]">sec</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-muted border mx-auto mb-1"></div>
              <div className="text-[10px]">muted</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-accent border mx-auto mb-1"></div>
              <div className="text-[10px]">accent</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-destructive border mx-auto mb-1"></div>
              <div className="text-[10px]">dest</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-card border mx-auto mb-1"></div>
              <div className="text-[10px]">card</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-border border mx-auto mb-1"></div>
              <div className="text-[10px]">border</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-ring border mx-auto mb-1"></div>
              <div className="text-[10px]">ring</div>
            </div>
          </div>
        </div>

        {/* LocalStorage Debug */}
        <div>
          <div className="text-sm font-medium mb-2">LocalStorage:</div>
          <div className="bg-muted/50 p-2 rounded text-xs font-mono space-y-1">
            <div>
              theme-preference:{' '}
              {typeof window !== 'undefined' ? localStorage.getItem('theme-preference') : 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
