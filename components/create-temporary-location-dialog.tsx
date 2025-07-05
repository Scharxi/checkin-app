import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MapPin, Plus } from 'lucide-react'
import { useCreateTemporaryLocation, type User } from '@/hooks/use-checkin-api'
import { useIsMobile } from '@/hooks/use-mobile'

interface CreateTemporaryLocationDialogProps {
  user: User
  trigger?: React.ReactNode
}

export const CreateTemporaryLocationDialog: React.FC<CreateTemporaryLocationDialogProps> = ({ 
  user, 
  trigger 
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createTemporaryLocationMutation = useCreateTemporaryLocation()
  const isMobile = useIsMobile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    try {
      await createTemporaryLocationMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        createdBy: user.id,
      })
      
      // Reset form and close dialog
      setName('')
      setDescription('')
      setOpen(false)
    } catch (error) {
      console.error('Error creating temporary location:', error)
    }
  }

  const defaultTrigger = (
    <Button 
      variant="outline" 
      size={isMobile ? "default" : "sm"}
      className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
    >
      <Plus className={`${isMobile ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-2'}`} />
      Temporäre Karte
    </Button>
  )

  const headerContent = (
    <div className="flex items-center gap-2">
      <div className={`${isMobile ? 'p-3' : 'p-2'} rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white`}>
        <MapPin className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
      </div>
      <span className={`font-semibold ${isMobile ? 'text-xl' : 'text-lg'}`}>
        Temporäre Karte erstellen
      </span>
    </div>
  )

  const descriptionContent = (
    <span className={`${isMobile ? 'text-base' : 'text-sm'} text-muted-foreground`}>
      Erstellen Sie eine temporäre Check-in-Karte. Diese wird <strong>automatisch gelöscht</strong>, wenn sich alle Personen wieder auschecken oder nach 5 Minuten ohne Nutzung.
    </span>
  )

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className={isMobile ? 'text-base' : ''}>
          Name der Karte
        </Label>
        <Input
          id="name"
          placeholder="z.B. Meeting Raum 3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          className={isMobile ? 'py-3 text-base' : ''}
        />
        <div className="flex justify-between items-center">
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
            Maximal 50 Zeichen
          </div>
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
            {name.length}/50
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description" className={isMobile ? 'text-base' : ''}>
          Beschreibung (optional)
        </Label>
        <Textarea
          id="description"
          placeholder="z.B. Spontanes Team-Meeting (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={isMobile ? 4 : 3}
          className={isMobile ? 'py-3 text-base resize-none' : ''}
        />
        <div className="flex justify-between items-center">
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
            Optional, maximal 200 Zeichen
          </div>
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
            {description.length}/200
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`border rounded-lg ${isMobile ? 'p-4' : 'p-3'} bg-orange-50/50`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`${isMobile ? 'p-2' : 'p-1.5'} rounded bg-gradient-to-br from-orange-500 to-orange-600 text-white`}>
            <MapPin className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
          </div>
          <Badge variant="outline" className={`${isMobile ? 'text-sm' : 'text-xs'} bg-orange-100 text-orange-700 border-orange-200`}>
            Temporär
          </Badge>
        </div>
        <div className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-slate-800`}>
          {name || 'Name der Karte'}
        </div>
        <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-slate-600 mt-1`}>
          {description || 'Temporäre Check-in-Karte'}
        </div>
      </div>
    </form>
  )

  const footerContent = (
    <div className={`flex gap-3 ${isMobile ? 'pt-4' : ''}`}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(false)}
        className={`flex-1 ${isMobile ? 'py-3 text-base' : ''}`}
      >
        Abbrechen
      </Button>
      <Button
        type="submit"
        disabled={!name.trim() || createTemporaryLocationMutation.isPending}
        className={`flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 ${isMobile ? 'py-3 text-base' : ''}`}
        onClick={handleSubmit}
      >
        {createTemporaryLocationMutation.isPending ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Erstelle...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Karte erstellen
          </div>
        )}
      </Button>
    </div>
  )

  // Mobile: Use Sheet (bottom drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || defaultTrigger}
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] flex flex-col p-0"
        >
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle>
              {headerContent}
            </SheetTitle>
            <SheetDescription>
              {descriptionContent}
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            {formContent}
          </div>
          
          <SheetFooter className="p-6 pt-4 border-t bg-gray-50/80 backdrop-blur-sm">
            {footerContent}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {headerContent}
          </DialogTitle>
          <DialogDescription>
            {descriptionContent}
          </DialogDescription>
        </DialogHeader>
        
        {formContent}

        <DialogFooter>
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 