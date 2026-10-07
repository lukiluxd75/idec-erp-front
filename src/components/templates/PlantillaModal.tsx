import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Box
} from '@mui/material';

interface PlantillaModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (payload: any) => void;
  tiposDocumento: { id: number; nombre: string }[];
  editData?: any;
}

export default function PlantillaModal({ open, onClose, onSaved, tiposDocumento, editData }: PlantillaModalProps) {
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [idTipo, setIdTipo] = useState<number | ''>('');
  const [cuerpoBaseHtml, setCuerpoBaseHtml] = useState('');

  useEffect(() => {
    if (editData) {
      setNombrePlantilla(editData.nombre_plantilla || '');
      setIdTipo(editData.id_tipo || '');
      setCuerpoBaseHtml(editData.cuerpo_base_html || '');
    } else {
      setNombrePlantilla('');
      setIdTipo('');
      setCuerpoBaseHtml('');
    }
  }, [editData, open]);

  const handleSubmit = () => {
    onSaved({
      nombre_plantilla: nombrePlantilla,
      id_tipo: idTipo,
      cuerpo_base_html: cuerpoBaseHtml
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editData ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          <TextField label="Nombre de la Plantilla" value={nombrePlantilla} onChange={e => setNombrePlantilla(e.target.value)} fullWidth />

          <FormControl fullWidth>
            <InputLabel>Tipo de Documento</InputLabel>
            <Select value={idTipo} label="Tipo de Documento" onChange={e => setIdTipo(e.target.value as number)}>
              {tiposDocumento.map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            label="Cuerpo HTML Base"
            value={cuerpoBaseHtml}
            onChange={e => setCuerpoBaseHtml(e.target.value)}
            fullWidth
            multiline
            rows={12}
            InputProps={{ sx: { fontFamily: 'monospace' } }}
            placeholder="<h1>Informe Técnico</h1><p>Fecha: {{fecha}}</p>..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!nombrePlantilla || !idTipo || !cuerpoBaseHtml}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}
