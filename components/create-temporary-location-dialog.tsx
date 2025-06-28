import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MapPin, Plus } from 'lucide-react'
import { useCreateTemporaryLocation, type User } from '@/hooks/use-checkin-api'

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm"
            className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            Temporäre Karte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <MapPin className="w-5 h-5" />
            </div>
            Temporäre Karte erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie eine temporäre Check-in-Karte. Diese wird <strong>automatisch gelöscht</strong>, wenn sich alle Personen wieder auschecken oder nach 5 Minuten ohne Nutzung.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name der Karte</Label>
            <Input
              id="name"
              placeholder="z.B. Meeting Raum 3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                Maximal 50 Zeichen
              </div>
              <div className="text-xs text-muted-foreground">
                {name.length}/50
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              placeholder="z.B. Spontanes Team-Meeting (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                Optional, maximal 200 Zeichen
              </div>
              <div className="text-xs text-muted-foreground">
                {description.length}/200
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-3 bg-orange-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <MapPin className="w-3 h-3" />
              </div>
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                Temporär
              </Badge>
            </div>
            <div className="text-sm font-medium text-slate-800">
              {name || 'Name der Karte'}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {description || 'Temporäre Check-in-Karte'}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createTemporaryLocationMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 