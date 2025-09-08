'use client'

import { useState } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { Label } from './label'
import { RadioGroup, RadioGroupItem } from './radio-group'
import { Checkbox } from './checkbox'
import { 
  Download, 
  FileText, 
  FileJson, 
  Table,
  Calendar,
  Clock,
  Info,
  Loader2
} from 'lucide-react'

interface ExportDialogProps {
  title?: string
  description?: string
  sessionCount?: number
  onExport: (options: ExportOptions) => Promise<void>
  isExporting?: boolean
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface ExportOptions {
  format: 'txt' | 'json' | 'csv'
  includeTimestamps: boolean
  includeMetadata: boolean
  timestampFormat: '24h' | '12h' | 'relative'
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'txt',
  includeTimestamps: true,
  includeMetadata: true,
  timestampFormat: 'relative'
}

export function ExportDialog({
  title = 'Export Translation History',
  description,
  sessionCount,
  onExport,
  isExporting = false,
  trigger,
  open,
  onOpenChange
}: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS)
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = async () => {
    try {
      await onExport(options)
      if (onOpenChange) {
        onOpenChange(false)
      } else {
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Export failed:', error)
      // Error handling could be improved with toast notifications
    }
  }

  const updateOptions = (key: keyof ExportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const formatInfo = {
    txt: {
      icon: FileText,
      name: 'Text File (.txt)',
      description: 'Human-readable format, great for sharing and reviewing'
    },
    json: {
      icon: FileJson,
      name: 'JSON File (.json)',
      description: 'Structured data format, perfect for analysis or importing'
    },
    csv: {
      icon: Table,
      name: 'CSV File (.csv)',
      description: 'Spreadsheet format, ideal for Excel or data analysis'
    }
  }

  const timestampInfo = {
    relative: 'Relative to session start (00:15, 01:23)',
    '24h': '24-hour time format (14:30:22)',
    '12h': '12-hour time format (2:30:22 PM)'
  }

  return (
    <Dialog 
      open={open !== undefined ? open : isOpen} 
      onOpenChange={onOpenChange || setIsOpen}
    >
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <p className="text-sm text-gray-600 mt-2">{description}</p>
          )}
          {sessionCount !== undefined && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2">
              <Info className="w-4 h-4" />
              <span>
                {sessionCount === 1 
                  ? '1 session will be exported'
                  : `${sessionCount} sessions will be exported`
                }
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Format */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">File Format</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value: 'txt' | 'json' | 'csv') => updateOptions('format', value)}
              className="space-y-3"
            >
              {Object.entries(formatInfo).map(([format, info]) => {
                const Icon = info.icon
                return (
                  <div key={format} className="flex items-start space-x-3">
                    <RadioGroupItem value={format} id={format} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={format} className="flex items-center space-x-2 cursor-pointer">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{info.name}</span>
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Include</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => updateOptions('includeMetadata', checked)}
                />
                <Label htmlFor="metadata" className="text-sm cursor-pointer">
                  Session metadata (date, languages, duration, etc.)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timestamps"
                  checked={options.includeTimestamps}
                  onCheckedChange={(checked) => updateOptions('includeTimestamps', checked)}
                />
                <Label htmlFor="timestamps" className="text-sm cursor-pointer">
                  Timestamps for each transcript segment
                </Label>
              </div>
            </div>
          </div>

          {/* Timestamp Format */}
          {options.includeTimestamps && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Timestamp Format</Label>
              <RadioGroup
                value={options.timestampFormat}
                onValueChange={(value: '24h' | '12h' | 'relative') => updateOptions('timestampFormat', value)}
                className="space-y-2"
              >
                {Object.entries(timestampInfo).map(([format, description]) => (
                  <div key={format} className="flex items-center space-x-2">
                    <RadioGroupItem value={format} id={`timestamp-${format}`} />
                    <Label htmlFor={`timestamp-${format}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium capitalize">
                          {format.replace('h', ' Hour')}
                        </span>
                        <span className="text-xs text-gray-500">- {description}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Format-specific preview */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
            <div className="text-xs text-gray-600 font-mono">
              {options.format === 'txt' && (
                <div>
                  Live Translator Session Export<br/>
                  ================================<br/><br/>
                  {options.includeMetadata && (
                    <>
                      Date: December 15, 2024 2:30:22 PM<br/>
                      Languages: English → Spanish<br/>
                      Mode: Live Translation<br/><br/>
                    </>
                  )}
                  {options.includeTimestamps && (
                    <>
                      {options.timestampFormat === 'relative' && '[00:15] Hello, how are you?'}
                      {options.timestampFormat === '24h' && '[14:30:37] Hello, how are you?'}
                      {options.timestampFormat === '12h' && '[2:30:37 PM] Hello, how are you?'}
                      <br/>
                      {options.timestampFormat === 'relative' && '[00:15] Hola, ¿cómo estás?'}
                      {options.timestampFormat === '24h' && '[14:30:37] Hola, ¿cómo estás?'}
                      {options.timestampFormat === '12h' && '[2:30:37 PM] Hola, ¿cómo estás?'}
                    </>
                  )}
                  {!options.includeTimestamps && (
                    <>
                      Hello, how are you?<br/>
                      Hola, ¿cómo estás?
                    </>
                  )}
                </div>
              )}
              
              {options.format === 'json' && (
                <div>
                  {`{`}<br/>
                  &nbsp;&nbsp;"session": {`{`}<br/>
                  {options.includeMetadata && (
                    <>
                      &nbsp;&nbsp;&nbsp;&nbsp;"date": "2024-12-15T14:30:22Z",<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;"languages": {`{`} "source": "en", "target": "es" {`}`},<br/>
                    </>
                  )}
                  &nbsp;&nbsp;{`}`},<br/>
                  &nbsp;&nbsp;"transcripts": [{`{`}<br/>
                  {options.includeTimestamps && (
                    <>
                      &nbsp;&nbsp;&nbsp;&nbsp;"timestamp_start_ms": 15000,<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;"timestamp_end_ms": 16000,<br/>
                    </>
                  )}
                  &nbsp;&nbsp;&nbsp;&nbsp;"source_text": "Hello, how are you?",<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;"target_text": "Hola, ¿cómo estás?"<br/>
                  &nbsp;&nbsp;{`}`}]<br/>
                  {`}`}
                </div>
              )}
              
              {options.format === 'csv' && (
                <div>
                  {options.includeTimestamps ? 
                    'timestamp_start_ms,timestamp_end_ms,source_text,target_text' :
                    'source_text,target_text'
                  }<br/>
                  {options.includeTimestamps ? 
                    '15000,16000,"Hello, how are you?","Hola, ¿cómo estás?"' :
                    '"Hello, how are you?","Hola, ¿cómo estás?"'
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange ? onOpenChange(false) : setIsOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="min-w-[100px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}