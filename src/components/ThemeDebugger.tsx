"use client"

import { useEffect, useState } from "react"
import { useAppTheme } from "@/lib/theme-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CSSVariable {
  name: string
  value: string
  computed: string
}

export function ThemeDebugger() {
  const { colorTheme, mode, resolvedTheme, isLoaded } = useAppTheme()
  const [cssVariables, setCssVariables] = useState<CSSVariable[]>([])
  const [domInfo, setDomInfo] = useState({
    dataTheme: '',
    darkClass: false,
    htmlClasses: '',
  })

  const [copyStatus, setCopyStatus] = useState('')

  const themeVars = [
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
  ]

  const refreshDebugInfo = () => {
    if (typeof window === 'undefined') return

    // Get DOM info
    const html = document.documentElement
    const dataTheme = html.getAttribute('data-theme') || 'none'
    const darkClass = html.classList.contains('dark')
    const htmlClasses = html.className

    setDomInfo({
      dataTheme,
      darkClass,
      htmlClasses,
    })

    // Get CSS variables
    const computedStyle = window.getComputedStyle(html)
    const variables: CSSVariable[] = []

    themeVars.forEach(varName => {
      const value = computedStyle.getPropertyValue(varName).trim()
      // Try to get the raw value from CSS
      const rawValue = html.style.getPropertyValue(varName) || 'inherited'
      
      variables.push({
        name: varName,
        value: rawValue,
        computed: value || 'undefined',
      })
    })

    setCssVariables(variables)
  }

  const handleCopyAll = () => {
    const textToCopy = cssVariables.map(v => `${v.name}: ${v.computed}`).join('\n')
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyStatus('Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    }).catch(() => {
      setCopyStatus('Failed to copy!')
      setTimeout(() => setCopyStatus(''), 2000)
    })
  }

  const handleCopyTestColors = () => {
    if (typeof window === 'undefined') return

    const testColors = [
      { name: 'background', className: 'bg-background' },
      { name: 'foreground', className: 'bg-foreground' },
      { name: 'card', className: 'bg-card' },
      { name: 'card-foreground', className: 'bg-card-foreground' },
      { name: 'primary', className: 'bg-primary' },
      { name: 'primary-foreground', className: 'bg-primary-foreground' },
      { name: 'secondary', className: 'bg-secondary' },
      { name: 'secondary-foreground', className: 'bg-secondary-foreground' },
      { name: 'muted', className: 'bg-muted' },
      { name: 'muted-foreground', className: 'bg-muted-foreground' },
      { name: 'accent', className: 'bg-accent' },
      { name: 'accent-foreground', className: 'bg-accent-foreground' },
      { name: 'destructive', className: 'bg-destructive' },
      { name: 'destructive-foreground', className: 'bg-destructive-foreground' },
      { name: 'border', className: 'bg-border' },
      { name: 'input', className: 'bg-input' },
      { name: 'ring', className: 'bg-ring' },
      { name: 'popover', className: 'bg-popover' },
      { name: 'popover-foreground', className: 'bg-popover-foreground' },
      { name: 'sidebar', className: 'bg-sidebar' },
      { name: 'sidebar-foreground', className: 'bg-sidebar-foreground' },
      { name: 'sidebar-primary', className: 'bg-sidebar-primary' },
      { name: 'sidebar-accent', className: 'bg-sidebar-accent' },
      { name: 'success', className: 'bg-success' },
      { name: 'warning', className: 'bg-warning' },
    ]

    const computedColors: string[] = []
    testColors.forEach(color => {
      const element = document.createElement('div')
      element.className = color.className
      document.body.appendChild(element)
      const computedStyle = window.getComputedStyle(element)
      computedColors.push(`${color.name}: ${computedStyle.backgroundColor}`)
      document.body.removeChild(element)
    })

    const textToCopy = computedColors.join('\n')
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyStatus('Test colors copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    }).catch(() => {
      setCopyStatus('Failed to copy test colors!')
      setTimeout(() => setCopyStatus(''), 2000)
    })
  }

  useEffect(() => {
    refreshDebugInfo()
    
    // Refresh on theme changes
    const interval = setInterval(refreshDebugInfo, 1000)
    
    return () => clearInterval(interval)
  }, [colorTheme, mode, resolvedTheme])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🔍 Theme Debugger
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium">Color Theme:</div>
            <Badge variant="outline">{colorTheme}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Mode:</div>
            <Badge variant="outline">{mode}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Resolved:</div>
            <Badge variant="outline">{resolvedTheme}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Loaded:</div>
            <Badge variant={isLoaded ? "default" : "destructive"}>
              {isLoaded ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        {/* DOM State Info */}
        <div className="border rounded p-3 bg-muted/50">
          <div className="text-sm font-medium mb-2">DOM State:</div>
          <div className="space-y-1 text-xs font-mono">
            <div>data-theme: <span className="bg-primary/10 px-1 rounded">{domInfo.dataTheme}</span></div>
            <div>dark class: <span className="bg-primary/10 px-1 rounded">{domInfo.darkClass.toString()}</span></div>
            <div>html classes: <span className="bg-primary/10 px-1 rounded">{domInfo.htmlClasses || 'none'}</span></div>
          </div>
        </div>

        {/* CSS Variables Table */}
        <div>
          <div className="text-sm font-medium mb-2">CSS Variables: {copyStatus && <span className="text-green-500 text-xs ml-2">{copyStatus}</span>}</div>
          <div className="border rounded overflow-hidden">
            <div className="bg-muted p-2 grid grid-cols-3 gap-2 text-xs font-medium">
              <div>Variable</div>
              <div>Computed Value</div>
              <div>Preview</div>
            </div>
            <div className="divide-y">
              {cssVariables.map((variable, index) => (
                <div key={index} className="p-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="font-mono">{variable.name}</div>
                  <div className="font-mono break-all">
                    {variable.computed || 'undefined'}
                  </div>
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 border rounded"
                      style={{ backgroundColor: `hsl(${variable.computed})` }}
                      title={`hsl(${variable.computed})`}
                    />
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

        {/* Current Theme CSS Preview */}
        <div>
          <div className="text-sm font-medium mb-2 flex items-center justify-between">
            <span>Theme Test Colors:</span>
            <Button onClick={handleCopyTestColors} size="sm" variant="outline">
              Copy Test Colors
            </Button>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {/* Core colors */}
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-background border mx-auto mb-1"></div>
              <div className="text-[10px]">bg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-card border mx-auto mb-1"></div>
              <div className="text-[10px]">card</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-card-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">card-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-primary border mx-auto mb-1"></div>
              <div className="text-[10px]">primary</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-primary-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">prim-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-secondary border mx-auto mb-1"></div>
              <div className="text-[10px]">sec</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-secondary-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">sec-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-muted border mx-auto mb-1"></div>
              <div className="text-[10px]">muted</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-muted-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">mut-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-accent border mx-auto mb-1"></div>
              <div className="text-[10px]">accent</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-accent-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">acc-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-destructive border mx-auto mb-1"></div>
              <div className="text-[10px]">dest</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-destructive-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">dest-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-border border mx-auto mb-1"></div>
              <div className="text-[10px]">border</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-input border mx-auto mb-1"></div>
              <div className="text-[10px]">input</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-ring border mx-auto mb-1"></div>
              <div className="text-[10px]">ring</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-popover border mx-auto mb-1"></div>
              <div className="text-[10px]">popover</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-popover-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">pop-fg</div>
            </div>
            {/* Status colors */}
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-success border mx-auto mb-1"></div>
              <div className="text-[10px]">success</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-warning border mx-auto mb-1"></div>
              <div className="text-[10px]">warning</div>
            </div>
            {/* Sidebar colors */}
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-sidebar border mx-auto mb-1"></div>
              <div className="text-[10px]">sidebar</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-sidebar-foreground border mx-auto mb-1"></div>
              <div className="text-[10px]">side-fg</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-sidebar-primary border mx-auto mb-1"></div>
              <div className="text-[10px]">side-pr</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-sidebar-accent border mx-auto mb-1"></div>
              <div className="text-[10px]">side-ac</div>
            </div>
          </div>
        </div>

        {/* Chart Colors */}
        <div>
          <div className="text-sm font-medium mb-2">Chart Colors:</div>
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-chart-1 border mx-auto mb-1"></div>
              <div className="text-[10px]">chart-1</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-chart-2 border mx-auto mb-1"></div>
              <div className="text-[10px]">chart-2</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-chart-3 border mx-auto mb-1"></div>
              <div className="text-[10px]">chart-3</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-chart-4 border mx-auto mb-1"></div>
              <div className="text-[10px]">chart-4</div>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded bg-chart-5 border mx-auto mb-1"></div>
              <div className="text-[10px]">chart-5</div>
            </div>
          </div>
        </div>

        {/* Local Storage Debug */}
        <div>
          <div className="text-sm font-medium mb-2">LocalStorage:</div>
          <div className="bg-muted/50 p-2 rounded text-xs font-mono space-y-1">
            <div>color-theme: {typeof window !== 'undefined' ? localStorage.getItem('color-theme') : 'N/A'}</div>
            <div>theme: {typeof window !== 'undefined' ? localStorage.getItem('theme') : 'N/A'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}