import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Palette, Download, Upload, Check, Moon, Sun } from "lucide-react"
import { ThemeConfig, ThemeSettings, applyTheme, loadThemeSettings, saveThemeSettings, createThemeFromTweakCN } from "@/lib/themes/theme-config"
import { PRESET_THEMES, getThemeById } from "@/lib/themes/preset-themes"

interface ThemeSelectorProps {
  className?: string
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className }) => {
  const [settings, setSettings] = useState<ThemeSettings>(loadThemeSettings())
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  // Apply theme on settings change
  useEffect(() => {
    const theme = getThemeById(settings.currentTheme)
    if (theme) {
      applyTheme(theme, settings.darkMode)
      
      // Update documentElement class for dark mode
      if (settings.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    
    // Save settings
    saveThemeSettings(settings)
  }, [settings])

  const handleThemeSelect = (themeId: string) => {
    setSettings(prev => ({
      ...prev,
      currentTheme: themeId
    }))
  }

  const handleDarkModeToggle = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      darkMode: enabled
    }))
  }

  const handleTouchModeToggle = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      touchMode: enabled
    }))
    
    // Toggle touch class on root element
    const root = document.documentElement
    if (enabled) {
      root.classList.add('touch-mode')
    } else {
      root.classList.remove('touch-mode')
    }
  }

  const handlePreviewTheme = (themeId: string) => {
    setPreviewTheme(themeId)
    const theme = getThemeById(themeId)
    if (theme) {
      applyTheme(theme, settings.darkMode)
    }
  }

  const handleCancelPreview = () => {
    setPreviewTheme(null)
    // Restore current theme
    const currentTheme = getThemeById(settings.currentTheme)
    if (currentTheme) {
      applyTheme(currentTheme, settings.darkMode)
    }
  }

  const handleConfirmPreview = () => {
    if (previewTheme) {
      handleThemeSelect(previewTheme)
    }
    setPreviewTheme(null)
  }

  const handleImportFromTweakCN = async () => {
    if (!importUrl) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una URL válida de TweakCN",
        variant: "destructive"
      })
      return
    }

    setIsImporting(true)
    try {
      // Convert TweakCN URL to JSON URL if needed
      let jsonUrl = importUrl
      if (importUrl.includes('tweakcn.com/') && !importUrl.endsWith('.json')) {
        jsonUrl = importUrl.replace('/themes/', '/r/themes/') + '.json'
      }

      const response = await fetch(jsonUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch theme data')
      }

      const themeData = await response.json()
      const customTheme = createThemeFromTweakCN(themeData)
      
      // For now, we'll just apply the theme directly
      // In a full implementation, you'd save it to local storage or state
      applyTheme(customTheme, settings.darkMode)
      
      toast({
        title: "Tema importado",
        description: `Tema "${customTheme.name}" importado exitosamente`,
      })
      
      setIsImportDialogOpen(false)
      setImportUrl('')
    } catch (error) {
      console.error('Error importing theme:', error)
      toast({
        title: "Error al importar tema",
        description: "No se pudo importar el tema. Verifica la URL e inténtalo de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getCategoryIcon = (category: ThemeConfig['category']) => {
    switch (category) {
      case 'restaurant': return '🍽️'
      case 'cafe': return '☕'
      case 'bar': return '🍸'
      case 'accessibility': return '♿'
      default: return '🎨'
    }
  }

  const getCategoryColor = (category: ThemeConfig['category']) => {
    switch (category) {
      case 'restaurant': return 'bg-accent/20 text-accent-foreground border-accent/20'
      case 'cafe': return 'bg-secondary/20 text-secondary-foreground border-secondary/20'
      case 'bar': return 'bg-primary/20 text-primary-foreground border-primary/20'
      case 'accessibility': return 'bg-muted/20 text-muted-foreground border-muted/20'
      default: return 'bg-muted/20 text-muted-foreground border-muted/20'
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Selector de Temas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Controls */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="darkMode" className="flex items-center gap-2">
                {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                Modo Oscuro
              </Label>
              <p className="text-xs text-muted-foreground">
                Activa el tema oscuro para ambientes con poca luz
              </p>
            </div>
            <Switch 
              id="darkMode" 
              checked={settings.darkMode} 
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="touchMode">Modo Táctil Optimizado</Label>
              <p className="text-xs text-muted-foreground">
                Aumenta el tamaño de botones y mejora la respuesta táctil
              </p>
            </div>
            <Switch 
              id="touchMode" 
              checked={settings.touchMode} 
              onCheckedChange={handleTouchModeToggle}
            />
          </div>

          {/* Import Theme */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(true)}
              className="w-full touch-target touch-feedback"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar desde TweakCN
            </Button>
          </div>

          {/* Theme Preview Controls */}
          {previewTheme && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium mb-2">Vista previa activa</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConfirmPreview} className="touch-target">
                  <Check className="mr-1 h-3 w-3" />
                  Aplicar
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelPreview} className="touch-target">
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Theme Grid */}
          <div className="space-y-4">
            <h4 className="font-medium">Temas Disponibles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_THEMES.map((theme) => (
                <Card 
                  key={theme.id}
                  className={`cursor-pointer transition-all touch-enhanced ${
                    settings.currentTheme === theme.id 
                      ? 'ring-2 ring-primary shadow-md' 
                      : 'hover:shadow-md'
                  } ${previewTheme === theme.id ? 'ring-2 ring-accent' : ''}`}
                  onClick={() => previewTheme ? handleConfirmPreview() : handlePreviewTheme(theme.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-base">{getCategoryIcon(theme.category)}</span>
                        {theme.name}
                      </CardTitle>
                      {settings.currentTheme === theme.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                    
                    <Badge variant="secondary" className={getCategoryColor(theme.category)}>
                      {theme.category}
                    </Badge>
                    
                    {/* Color Preview */}
                    {theme.preview && (
                      <div className="flex gap-1">
                        <div 
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: theme.preview.primaryColor }}
                          title="Color primario"
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: theme.preview.secondaryColor }}
                          title="Color secundario"
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: theme.preview.backgroundColor }}
                          title="Color de fondo"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Tema desde TweakCN</DialogTitle>
            <DialogDescription>
              Ingresa la URL del tema de TweakCN que deseas importar.
              Ejemplo: https://tweakcn.com/themes/theme-name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://tweakcn.com/themes/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="touch-input"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)}
              className="touch-target"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImportFromTweakCN}
              disabled={isImporting || !importUrl}
              className="touch-target"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Importar Tema
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ThemeSelector