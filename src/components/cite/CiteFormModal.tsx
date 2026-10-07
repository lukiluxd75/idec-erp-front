import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Box
} from '@mui/material';
// Importa tus llamadas a la API aquí si es necesario
// import { createSigla, updateSigla } from '../../api/citeApi';

interface CiteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (payload: any) => void;
  areas: { id: string; nombre: string }[];
  gestiones: { id: number; anio: number }[];
  editData?: any;
}

export default function CiteFormModal({ open, onClose, onSaved, areas, gestiones, editData }: CiteFormModalProps) {
  const [idArea, setIdArea] = useState('');
  const [idGestion, setIdGestion] = useState<number | ''>('');
  const [prefijo, setPrefijo] = useState('');

  useEffect(() => {
    if (editData) {
      setIdArea(editData.id_area || '');
      setIdGestion(editData.id_gestion || '');
      setPrefijo(editData.prefijo || '');
    } else {
      setIdArea('');
      setIdGestion('');
      setPrefijo('');
    }
  }, [editData, open]);

  const handleSubmit = () => {
    const payload = {
      id_area: idArea,
      id_gestion: idGestion,
      prefijo: prefijo.toUpperCase()
    };
    onSaved(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editData ? 'Editar Sigla CITE' : 'Nueva Sigla de CITE'}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          <FormControl fullWidth>
            <InputLabel>Área</InputLabel>
            <Select value={idArea} label="Área" onChange={e => setIdArea(e.target.value as string)}>
              {areas.map(a => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Gestión</InputLabel>
            <Select value={idGestion} label="Gestión" onChange={e => setIdGestion(e.target.value as number)}>
              {gestiones.map(g => <MenuItem key={g.id} value={g.id}>{g.anio}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField 
            label="Prefijo (ej: DGC)" 
            value={prefijo} 
            onChange={e => setPrefijo(e.target.value.toUpperCase())} 
            fullWidth 
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!idArea || !idGestion || !prefijo}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
