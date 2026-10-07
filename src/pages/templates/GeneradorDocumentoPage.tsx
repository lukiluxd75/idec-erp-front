import React, { useState, useRef, useMemo } from 'react';
import {
  Container, Stepper, Step, StepLabel, Button, Box, Paper, Typography,
  TextField, IconButton, Table, TableHead, TableBody, TableRow, TableCell
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Editor } from '@tinymce/tinymce-react';

const STEPS = ['Formulario Dinámico', 'Inmuebles de Referencia', 'Editor Final'];

export default function GeneradorDocumentoPage({ plantillaSeleccionada, variablesPlantilla }: any) {
  const [activeStep, setActiveStep] = useState(0);
  const editorRef = useRef<any>(null);

  // Paso 1: Variables dinámicas
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // Paso 2: Inmuebles
  const [inmuebles, setInmuebles] = useState([{ n_inmueble: '', codigo_catastral: '', observacion_corta: '' }]);

  // Paso 3: HTML Procesado
  const [htmlFinal, setHtmlFinal] = useState('');

  // ----------------------------------------------------------------------
  // MOTOR DE RENDERIZADO (Reemplazo RegEx + Inyección de Tabla)
  // ----------------------------------------------------------------------
  const procesarPlantilla = () => {
    if (!plantillaSeleccionada) return;

    // 1. Reemplazar llaves tipo {{variable}}
    let htmlModificado = plantillaSeleccionada.cuerpo_base_html;
    htmlModificado = htmlModificado.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
      return formData[key] !== undefined && formData[key] !== '' ? formData[key] : match;
    });

    // 2. Construir la tabla dinámica de inmuebles si existen
    if (inmuebles.some(i => i.n_inmueble || i.codigo_catastral)) {
      const filasInmuebles = inmuebles
        .filter(i => i.n_inmueble || i.codigo_catastral)
        .map((i, index) => `
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px;">${index + 1}</td>
            <td style="border: 1px solid #ccc; padding: 5px;">${i.n_inmueble}</td>
            <td style="border: 1px solid #ccc; padding: 5px;">${i.codigo_catastral}</td>
            <td style="border: 1px solid #ccc; padding: 5px;">${i.observacion_corta || ''}</td>
          </tr>
        `).join('');

      const tablaHTML = `
        <br/>
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ccc; padding: 5px;">N°</th>
              <th style="border: 1px solid #ccc; padding: 5px;">N° Inmueble</th>
              <th style="border: 1px solid #ccc; padding: 5px;">Código Catastral</th>
              <th style="border: 1px solid #ccc; padding: 5px;">Observaciones</th>
            </tr>
          </thead>
          <tbody>${filasInmuebles}</tbody>
        </table>
      `;
      // Añadimos la tabla al final del documento
      htmlModificado += tablaHTML;
    }

    setHtmlFinal(htmlModificado);
  };

  // Manejadores de Flujo
  const handleNext = () => {
    if (activeStep === 1) {
      procesarPlantilla(); // Antes de ir al editor, procesar el string HTML
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSave = () => {
    // Extracción del HTML final desde TinyMCE
    const cuerpo_editado_final = editorRef.current ? editorRef.current.getContent() : htmlFinal;

    const payload = {
      id_plantilla: plantillaSeleccionada?.id,
      datos_variables_json: formData,
      cuerpo_editado_final: cuerpo_editado_final,
      inmuebles: inmuebles.filter(i => i.n_inmueble)
    };
    
    console.log("Listo para enviar al backend:", payload);
    // await api.post('/templates/documentos', payload);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>Generador de Documentos Catastrales</Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Paper sx={{ p: 4, minHeight: '60vh' }}>
        
        {/* PASO 1: Formulario Dinámico de Variables */}
        {activeStep === 0 && (
          <Box display="flex" flexDirection="column" gap={3}>
            <Typography variant="h6">Llene los datos del documento</Typography>
            {variablesPlantilla?.map((variable: any) => (
              <TextField
                key={variable.llave_json}
                label={variable.titulo_formulario}
                type={variable.tipo_campo === 'fecha' ? 'date' : variable.tipo_campo === 'numero' ? 'number' : 'text'}
                multiline={variable.tipo_campo === 'parrafo'}
                rows={variable.tipo_campo === 'parrafo' ? 3 : 1}
                required={variable.es_obligatorio}
                InputLabelProps={{ shrink: true }}
                value={formData[variable.llave_json] || ''}
                onChange={(e) => setFormData({ ...formData, [variable.llave_json]: e.target.value })}
                fullWidth
              />
            ))}
          </Box>
        )}

        {/* PASO 2: Tabla de Inmuebles Base */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Inmuebles de Referencia</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>N° Inmueble</TableCell>
                  <TableCell>Código Catastral</TableCell>
                  <TableCell>Observación (Opcional)</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inmuebles.map((inm, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField size="small" value={inm.n_inmueble} onChange={e => {
                        const newArr = [...inmuebles]; newArr[index].n_inmueble = e.target.value; setInmuebles(newArr);
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={inm.codigo_catastral} onChange={e => {
                        const newArr = [...inmuebles]; newArr[index].codigo_catastral = e.target.value; setInmuebles(newArr);
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={inm.observacion_corta} onChange={e => {
                        const newArr = [...inmuebles]; newArr[index].observacion_corta = e.target.value; setInmuebles(newArr);
                      }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => setInmuebles(inmuebles.filter((_, i) => i !== index))} color="error"><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button startIcon={<AddIcon />} onClick={() => setInmuebles([...inmuebles, { n_inmueble: '', codigo_catastral: '', observacion_corta: '' }])} sx={{ mt: 2 }}>
              Añadir Inmueble
            </Button>
          </Box>
        )}

        {/* PASO 3: EL EDITOR WYSIWYG */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Edición Final del Documento</Typography>
            <Editor
              tinymceScriptSrc="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js"
              onInit={(evt, editor) => (editorRef.current = editor)}
              initialValue={htmlFinal}
              init={{
                height: 700,
                menubar: true,
                language: 'es',
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'paste'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | ' +
                  'bullist numlist outdent indent | removeformat | image fullscreen',
                paste_data_images: true,
                content_style: `
                  body { font-family: 'Times New Roman', serif; font-size: 14px; margin: 2cm; }
                  table { border-collapse: collapse; width: 100%; }
                  table td, table th { border: 1px solid #000; padding: 5px; }
                `,
                table_advtab: true,
                table_cell_advtab: true,
                table_row_advtab: true
              }}
            />
          </Box>
        )}

      </Paper>

      {/* Controles del Stepper */}
      <Box display="flex" justifyContent="space-between" mt={2}>
        <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
          Atrás
        </Button>
        {activeStep === STEPS.length - 1 ? (
          <Button variant="contained" color="success" onClick={handleSave}>
            Guardar y Generar Documento
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            Siguiente
          </Button>
        )}
      </Box>
    </Container>
  );
}
