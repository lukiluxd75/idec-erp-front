import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Switch, FormControlLabel, Box
} from '@mui/material';

interface VariableModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (payload: any) => void;
  editData?: any;
}

export default function VariableModal({ open, onClose, onSaved, editData }: VariableModalProps) {
  const [llaveJson, setLlaveJson] = useState('');
  const [tituloFormulario, setTituloFormulario] = useState('');
  const [tipoCampo, setTipoCampo] = useState('texto_corto');
  const [esObligatorio, setEsObligatorio] = useState(true);
  const [orden, setOrden] = useState(1);

  useEffect(() => {
    if (editData) {
      setLlaveJson(editData.llave_json || '');
      setTituloFormulario(editData.titulo_formulario || '');
      setTipoCampo(editData.tipo_campo || 'texto_corto');
      setEsObligatorio(editData.es_obligatorio ?? true);
      setOrden(editData.orden || 1);
    } else {
      setLlaveJson('');
      setTituloFormulario('');
      setTipoCampo('texto_corto');
      setEsObligatorio(true);
      setOrden(1);
    }
  }, [editData, open]);

  const formatLlave = (val: string) => val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editData ? 'Editar Variable' : 'Registrar Variable'}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          <TextField 
            label="Llave JSON (ej: nombre_interesado)" 
            value={llaveJson} 
            onChange={e => setLlaveJson(formatLlave(e.target.value))} 
            helperText="Se usará como {{llave_json}} en la plantilla HTML"
            fullWidth 
          />
          <TextField label="Título del formulario (ej: Nombre del Solicitante)" value={tituloFormulario} onChange={e => setTituloFormulario(e.target.value)} fullWidth />

          <FormControl fullWidth>
            <InputLabel>Tipo de Campo</InputLabel>
            <Select value={tipoCampo} label="Tipo de Campo" onChange={e => setTipoCampo(e.target.value)}>
              <MenuItem value="texto_corto">Texto Corto</MenuItem>
              <MenuItem value="parrafo">Párrafo</MenuItem>
              <MenuItem value="fecha">Fecha</MenuItem>
              <MenuItem value="numero">Número</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Orden en el formulario" type="number" value={orden} onChange={e => setOrden(Number(e.target.value))} fullWidth />
          <FormControlLabel control={<Switch checked={esObligatorio} onChange={e => setEsObligatorio(e.target.checked)} />} label="¿Es obligatorio?" />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSaved({ llave_json: llaveJson, titulo_formulario: tituloFormulario, tipo_campo: tipoCampo, es_obligatorio: esObligatorio, orden })} disabled={!llaveJson || !tituloFormulario}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}
