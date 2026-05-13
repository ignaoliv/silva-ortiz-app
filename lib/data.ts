import type { Usuario, Cliente, Caso, Audiencia, Movimiento } from '@/types'
import { addDays, toISODate } from './utils'

// Fecha de referencia (hoy en producción sería new Date())
const HOY = new Date()
HOY.setHours(0, 0, 0, 0)

const d = (n: number) => toISODate(addDays(HOY, n))

// ─── USUARIOS ──────────────────────────────────────────────
export const USUARIOS: Usuario[] = [
  { id: 1, nombre: 'Iván Ortiz',      tipo: 'Socio',     color: '#2563eb', iniciales: 'IO', email: 'iortiz@silvaortiz.com'      },
  { id: 2, nombre: 'Ana Silva',       tipo: 'Socia',     color: '#7c3aed', iniciales: 'AS', email: 'asilva@silvaortiz.com'      },
  { id: 3, nombre: 'María Fernández', tipo: 'Asociada',  color: '#059669', iniciales: 'MF', email: 'mfernandez@silvaortiz.com' },
  { id: 4, nombre: 'Carlos Ruiz',     tipo: 'Asociado',  color: '#dc2626', iniciales: 'CR', email: 'cruiz@silvaortiz.com'      },
  { id: 5, nombre: 'Valentina Cruz',  tipo: 'Asociada',  color: '#0891b2', iniciales: 'VC', email: 'vcruz@silvaortiz.com'      },
]

// ─── CLIENTES ──────────────────────────────────────────────
export const CLIENTES: Cliente[] = [
  { id: 1,  nombre: 'María García',          tipo: 'Persona física',   cuit: '20-28341567-3', email: 'mgarcia@gmail.com',     tel: '11-4512-3456', casos: 3, color: '#2563eb' },
  { id: 2,  nombre: 'Carlos López',          tipo: 'Persona física',   cuit: '20-18234567-9', email: 'clopez@email.com',      tel: '11-4523-7890', casos: 1, color: '#7c3aed' },
  { id: 3,  nombre: 'Laura Rodríguez',       tipo: 'Persona física',   cuit: '27-31234567-2', email: 'lrodriguez@mail.com',   tel: '11-4534-5678', casos: 2, color: '#059669' },
  { id: 4,  nombre: 'TechSoft SRL',          tipo: 'Persona jurídica', cuit: '30-71234567-8', email: 'legal@techsoft.com',    tel: '11-5234-1234', casos: 4, color: '#ea580c' },
  { id: 5,  nombre: 'José Martínez',         tipo: 'Persona física',   cuit: '20-22345678-4', email: 'jmartinez@gmail.com',   tel: '11-4556-9012', casos: 2, color: '#dc2626' },
  { id: 6,  nombre: 'Construir SA',          tipo: 'Persona jurídica', cuit: '30-68234567-1', email: 'info@construir.com',    tel: '11-4560-2345', casos: 2, color: '#0891b2' },
  { id: 7,  nombre: 'Luis Herrera',          tipo: 'Persona física',   cuit: '20-25678901-5', email: 'lherrera@mail.com',     tel: '11-4567-8901', casos: 2, color: '#d97706' },
  { id: 8,  nombre: 'Fernández Corp SRL',    tipo: 'Persona jurídica', cuit: '30-72345678-4', email: 'legal@fernandez.com',   tel: '11-5240-5678', casos: 2, color: '#7c3aed' },
  { id: 9,  nombre: 'Carmen Ruiz',           tipo: 'Persona física',   cuit: '27-29012345-6', email: 'cruiz@email.com',       tel: '11-4578-9012', casos: 1, color: '#059669' },
  { id: 10, nombre: 'Global Inversiones SA', tipo: 'Persona jurídica', cuit: '30-69345678-7', email: 'legal@global.com',      tel: '11-5250-3456', casos: 3, color: '#2563eb' },
  { id: 11, nombre: 'Patricia Romero',       tipo: 'Persona física',   cuit: '27-30123456-1', email: 'promero@gmail.com',     tel: '11-4589-1234', casos: 1, color: '#ea580c' },
  { id: 12, nombre: 'Inversiones del Sur SA',tipo: 'Persona jurídica', cuit: '30-70456789-3', email: 'info@invsur.com',       tel: '11-5260-7890', casos: 2, color: '#dc2626' },
]

// ─── CASOS ─────────────────────────────────────────────────
export const CASOS: Caso[] = [
  { id:1,  nro:'EXP-2024-001', exp:'12345/2024', caratula:'García, María c/ Pérez, Juan s/ Daños y Perjuicios',           cliente_id:1,  estado:'Activo',     responsable_id:1, fuero:'Civil',            jurisdiccion:'CABA',         juzgado:'Juzgado Civil N° 15',        tipo:'Ordinario',      fecha_alta:'2024-01-10', fecha_notif:'2024-02-15', vencimiento:d(2),   monto:850000,   cerrado:false },
  { id:2,  nro:'EXP-2024-002', exp:'23456/2024', caratula:'López, Carlos c/ Banco del Sur s/ Ejecutivo',                   cliente_id:2,  estado:'Activo',     responsable_id:2, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 8',     tipo:'Ejecutivo',      fecha_alta:'2024-01-22', fecha_notif:'2024-03-01', vencimiento:d(6),   monto:1200000,  cerrado:false },
  { id:3,  nro:'EXP-2024-003', exp:'34567/2024', caratula:'Rodríguez, Laura s/ Sucesión Ab Intestato',                     cliente_id:3,  estado:'En trámite', responsable_id:1, fuero:'Civil',            jurisdiccion:'La Plata',     juzgado:'Juzgado Civil N° 4',         tipo:'Sumarísimo',     fecha_alta:'2024-02-05', fecha_notif:null,         vencimiento:d(8),   monto:0,        cerrado:false },
  { id:4,  nro:'EXP-2024-004', exp:'45678/2024', caratula:'TechSoft SRL c/ Innovar SA s/ Cobro de Pesos',                  cliente_id:4,  estado:'Activo',     responsable_id:3, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 3',     tipo:'Ordinario',      fecha_alta:'2024-02-18', fecha_notif:'2024-04-10', vencimiento:d(11),  monto:3400000,  cerrado:false },
  { id:5,  nro:'EXP-2024-005', exp:'56789/2024', caratula:'Martínez, José c/ Gómez, Ana s/ Alimentos',                    cliente_id:5,  estado:'En trámite', responsable_id:2, fuero:'Familia',           jurisdiccion:'CABA',         juzgado:'Juzgado de Familia N° 7',    tipo:'Sumarísimo',     fecha_alta:'2024-03-01', fecha_notif:'2024-04-20', vencimiento:d(15),  monto:0,        cerrado:false },
  { id:6,  nro:'EXP-2024-006', exp:'67890/2024', caratula:'Construir SA c/ Estado Nacional s/ Contratación Pública',       cliente_id:6,  estado:'Archivado',  responsable_id:3, fuero:'Contencioso-Adm.', jurisdiccion:'Federal',      juzgado:'Cám. Fed. Cont.-Adm.',       tipo:'Ordinario',      fecha_alta:'2024-03-15', fecha_notif:'2024-05-01', vencimiento:d(21),  monto:8750000,  cerrado:false },
  { id:7,  nro:'EXP-2024-007', exp:'78901/2024', caratula:'Herrera, Luis s/ Accidente Laboral (ART Protección SA)',        cliente_id:7,  estado:'Activo',     responsable_id:4, fuero:'Laboral',           jurisdiccion:'CABA',         juzgado:'Tribunal Laboral N° 12',     tipo:'ART',            fecha_alta:'2024-04-02', fecha_notif:'2024-05-15', vencimiento:d(3),   monto:2100000,  cerrado:false },
  { id:8,  nro:'EXP-2024-008', exp:'89012/2024', caratula:'Fernández Corp SRL c/ Municipalidad de Quilmes s/ Daños',       cliente_id:8,  estado:'En trámite', responsable_id:5, fuero:'Contencioso-Adm.', jurisdiccion:'Buenos Aires', juzgado:'Juzgado Cont.-Adm. N° 2',    tipo:'Ordinario',      fecha_alta:'2024-04-15', fecha_notif:'2024-06-01', vencimiento:d(18),  monto:5200000,  cerrado:false },
  { id:9,  nro:'EXP-2024-009', exp:'90123/2024', caratula:'Ruiz, Carmen c/ Seguro Nacional SA s/ Siniestro',               cliente_id:9,  estado:'Activo',     responsable_id:1, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 11',    tipo:'Ordinario',      fecha_alta:'2024-04-28', fecha_notif:'2024-06-15', vencimiento:d(25),  monto:680000,   cerrado:false },
  { id:10, nro:'EXP-2024-010', exp:'01234/2024', caratula:'Global Inversiones SA s/ Concurso Preventivo',                  cliente_id:10, estado:'Activo',     responsable_id:2, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 6',     tipo:'Concursal',      fecha_alta:'2024-05-10', fecha_notif:'2024-07-01', vencimiento:d(30),  monto:45000000, cerrado:false },
  { id:11, nro:'EXP-2024-011', exp:'11235/2024', caratula:'Romero, Patricia c/ Supermercado Éxito SA s/ Daños',            cliente_id:11, estado:'En trámite', responsable_id:3, fuero:'Civil',            jurisdiccion:'CABA',         juzgado:'Juzgado Civil N° 22',        tipo:'Ordinario',      fecha_alta:'2024-05-20', fecha_notif:'2024-07-10', vencimiento:d(35),  monto:420000,   cerrado:false },
  { id:12, nro:'EXP-2024-012', exp:'22346/2024', caratula:'TechSoft SRL c/ Ministerio de Economía s/ Impugnación',         cliente_id:4,  estado:'En trámite', responsable_id:4, fuero:'Contencioso-Adm.', jurisdiccion:'Federal',      juzgado:'Juzgado Fed. N° 5',          tipo:'Ordinario',      fecha_alta:'2024-06-01', fecha_notif:null,         vencimiento:d(40),  monto:0,        cerrado:false },
  { id:13, nro:'EXP-2024-013', exp:'33457/2024', caratula:'Inversiones del Sur SA c/ Banco Nación s/ Nulidad',             cliente_id:12, estado:'Archivado',  responsable_id:5, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Cámara Comercial Sala C',    tipo:'Ordinario',      fecha_alta:'2024-06-15', fecha_notif:'2024-08-01', vencimiento:d(45),  monto:12000000, cerrado:false },
  { id:14, nro:'EXP-2024-014', exp:'44568/2024', caratula:'García, María c/ OSDE s/ Prestaciones Médicas',                 cliente_id:1,  estado:'Activo',     responsable_id:1, fuero:'Civil',            jurisdiccion:'CABA',         juzgado:'Juzgado Civil N° 9',         tipo:'Amparo',         fecha_alta:'2024-07-01', fecha_notif:'2024-08-15', vencimiento:d(50),  monto:0,        cerrado:false },
  { id:15, nro:'EXP-2024-015', exp:'55679/2024', caratula:'Construir SA s/ Quiebra Propia',                                 cliente_id:6,  estado:'Activo',     responsable_id:2, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 1',     tipo:'Concursal',      fecha_alta:'2024-07-20', fecha_notif:'2024-09-01', vencimiento:d(55),  monto:0,        cerrado:false },
  { id:16, nro:'EXP-2024-016', exp:'66780/2024', caratula:'Rodríguez, Laura c/ Sucesores de García s/ Reivindicación',     cliente_id:3,  estado:'En trámite', responsable_id:3, fuero:'Civil',            jurisdiccion:'La Plata',     juzgado:'Juzgado Civil N° 2',         tipo:'Ordinario',      fecha_alta:'2024-08-05', fecha_notif:null,         vencimiento:d(60),  monto:3200000,  cerrado:false },
  { id:17, nro:'EXP-2024-017', exp:'77891/2024', caratula:'Herrera, Luis c/ Empresa Constructora Andes SA s/ Laboral',     cliente_id:7,  estado:'Activo',     responsable_id:4, fuero:'Laboral',           jurisdiccion:'CABA',         juzgado:'Tribunal Laboral N° 5',      tipo:'Ordinario',      fecha_alta:'2024-08-20', fecha_notif:'2024-10-01', vencimiento:d(0),   monto:1850000,  cerrado:false },
  { id:18, nro:'EXP-2024-018', exp:'88902/2024', caratula:'Global Inversiones SA c/ Telefónica SA s/ Rescisión',           cliente_id:10, estado:'Cerrado',    responsable_id:5, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 9',     tipo:'Ordinario',      fecha_alta:'2024-09-01', fecha_notif:'2024-10-15', vencimiento:null,   monto:7500000,  cerrado:true  },
  { id:19, nro:'EXP-2025-001', exp:'10001/2025', caratula:'Fernández Corp SRL c/ Proveedor Norte SA s/ Incumplimiento',    cliente_id:8,  estado:'Activo',     responsable_id:1, fuero:'Comercial',        jurisdiccion:'CABA',         juzgado:'Juzgado Comercial N° 4',     tipo:'Ejecutivo',      fecha_alta:'2025-01-10', fecha_notif:'2025-02-20', vencimiento:d(-2),  monto:920000,   cerrado:false },
  { id:20, nro:'EXP-2025-002', exp:'20002/2025', caratula:'Martínez, José s/ Accidente de Tránsito',                        cliente_id:5,  estado:'Activo',     responsable_id:2, fuero:'Civil',            jurisdiccion:'CABA',         juzgado:'Juzgado Civil N° 18',        tipo:'Ordinario',      fecha_alta:'2025-02-01', fecha_notif:'2025-03-15', vencimiento:d(-5),  monto:350000,   cerrado:false },
  { id:21, nro:'EXP-2025-003', exp:'30003/2025', caratula:'TechSoft SRL c/ DataCloud SA s/ Propiedad Intelectual',         cliente_id:4,  estado:'En trámite', responsable_id:3, fuero:'Civil',            jurisdiccion:'CABA',         juzgado:'Juzgado Civil N° 31',        tipo:'Ordinario',      fecha_alta:'2025-03-01', fecha_notif:null,         vencimiento:d(70),  monto:15000000, cerrado:false },
  { id:22, nro:'EXP-2025-004', exp:'40004/2025', caratula:'García, María c/ Banco Popular SA s/ Usura',                    cliente_id:1,  estado:'Activo',     responsable_id:5, fuero:'Penal',            jurisdiccion:'Federal',      juzgado:'Juzgado Federal N° 3',       tipo:'Denuncia penal', fecha_alta:'2025-04-01', fecha_notif:'2025-05-01', vencimiento:d(12),  monto:0,        cerrado:false },
  { id:23, nro:'EXP-2025-005', exp:'50005/2025', caratula:'Inversiones del Sur SA c/ AFIP s/ Recurso Fiscal',              cliente_id:12, estado:'En trámite', responsable_id:4, fuero:'Contencioso-Adm.', jurisdiccion:'Federal',      juzgado:'Cám. Fed. Cont.-Adm.',       tipo:'Ordinario',      fecha_alta:'2025-04-15', fecha_notif:null,         vencimiento:d(22),  monto:4300000,  cerrado:false },
]

// ─── AUDIENCIAS ────────────────────────────────────────────
export const AUDIENCIAS: Audiencia[] = [
  { id:1,  caso_id:1,  caratula:'García c/ Pérez',              tipo:'Audiencia de Vista',       fecha:d(0),  hora:'09:00', lugar:'Juzgado Civil N° 15, Piso 4',  modalidad:'Presencial', estado:'Programada', abogado:'Iván Ortiz'      },
  { id:2,  caso_id:7,  caratula:'Herrera s/ Accidente Laboral', tipo:'Audiencia Preliminar',     fecha:d(0),  hora:'11:30', lugar:'Tribunal Laboral N° 12',        modalidad:'Presencial', estado:'Programada', abogado:'Carlos Ruiz'     },
  { id:3,  caso_id:19, caratula:'Fernández Corp c/ Proveedor',  tipo:'Audiencia Ejecutiva',      fecha:d(0),  hora:'15:00', lugar:'Juzgado Comercial N° 4',        modalidad:'Virtual',    estado:'Programada', abogado:'Iván Ortiz'      },
  { id:4,  caso_id:2,  caratula:'López c/ Banco del Sur',       tipo:'Informe pericial',         fecha:d(2),  hora:'10:00', lugar:'Juzgado Comercial N° 8',        modalidad:'Presencial', estado:'Programada', abogado:'Ana Silva'       },
  { id:5,  caso_id:5,  caratula:'Martínez c/ Gómez',            tipo:'Audiencia de familia',     fecha:d(3),  hora:'09:30', lugar:'Juzgado de Familia N° 7',       modalidad:'Presencial', estado:'Programada', abogado:'Ana Silva'       },
  { id:6,  caso_id:4,  caratula:'TechSoft c/ Innovar',          tipo:'Audiencia de prueba',      fecha:d(4),  hora:'14:00', lugar:'Juzgado Comercial N° 3',        modalidad:'Virtual',    estado:'Programada', abogado:'María Fernández' },
  { id:7,  caso_id:9,  caratula:'Ruiz c/ Seguro Nacional',      tipo:'Audiencia conciliat.',     fecha:d(5),  hora:'10:30', lugar:'Juzgado Comercial N° 11',       modalidad:'Presencial', estado:'Programada', abogado:'Iván Ortiz'      },
  { id:8,  caso_id:11, caratula:'Romero c/ Supermercado Éxito', tipo:'Mediación previa',         fecha:d(6),  hora:'16:00', lugar:'CMEBA - Centros de Mediación',  modalidad:'Presencial', estado:'Programada', abogado:'María Fernández' },
  { id:9,  caso_id:14, caratula:'García c/ OSDE',               tipo:'Audiencia de amparo',      fecha:d(7),  hora:'09:00', lugar:'Juzgado Civil N° 9',            modalidad:'Virtual',    estado:'Programada', abogado:'Iván Ortiz'      },
  { id:10, caso_id:22, caratula:'García c/ Banco Popular',      tipo:'Audiencia indagatoria',    fecha:d(8),  hora:'11:00', lugar:'Juzgado Federal N° 3',          modalidad:'Presencial', estado:'Programada', abogado:'Valentina Cruz'  },
  { id:11, caso_id:8,  caratula:'Fernández Corp c/ Municipalidad', tipo:'Audiencia testimonial', fecha:d(10), hora:'14:30', lugar:'Juzgado Cont.-Adm. N° 2',       modalidad:'Presencial', estado:'Programada', abogado:'Valentina Cruz'  },
  { id:12, caso_id:3,  caratula:'Rodríguez s/ Sucesión',         tipo:'Audiencia informativa',   fecha:d(12), hora:'10:00', lugar:'Juzgado Civil N° 4',            modalidad:'Virtual',    estado:'Programada', abogado:'Iván Ortiz'      },
]

// ─── HELPERS ───────────────────────────────────────────────
export function getCliente(id: number): Cliente {
  return CLIENTES.find(c => c.id === id) ?? { id: 0, nombre: '—', tipo: 'Persona física', cuit: '—', email: '—', tel: '—', casos: 0, color: '#999' }
}

export function getUsuario(id: number): Usuario {
  return USUARIOS.find(u => u.id === id) ?? { id: 0, nombre: '—', tipo: '—', color: '#999', iniciales: '?', email: '—' }
}

export function getMovimientos(casoId: number): Movimiento[] {
  const now = new Date()
  const BASE = [
    { tipo: 'Inicio',    titulo: 'Presentación de demanda',   desc: 'Se presentó escrito de demanda con prueba documental adjunta.',              user: 'Ana Silva',      color: 'green'  as const, delta: -180 },
    { tipo: 'Traslado',  titulo: 'Traslado de demanda',        desc: 'Juzgado ordena traslado por 15 días hábiles.',                              user: 'Iván Ortiz',     color: 'blue'   as const, delta: -150 },
    { tipo: 'Audiencia', titulo: 'Audiencia de conciliación',  desc: 'Las partes no llegan a acuerdo. Se fija fecha de juicio.',                  user: 'María Fernández', color: 'orange' as const, delta: -90  },
    { tipo: 'Pericia',   titulo: 'Pericia médica',             desc: 'El perito designado por el juzgado emitió informe. Incapacidad: 30%.',      user: 'Carlos Ruiz',    color: 'blue'   as const, delta: -45  },
    { tipo: 'Alegato',   titulo: 'Presentación de alegatos',   desc: 'Se presentaron alegatos escritos en tiempo y forma.',                       user: 'Ana Silva',      color: 'green'  as const, delta: -10  },
  ]
  return BASE.map((m, i) => ({
    ...m,
    id: casoId * 100 + i,
    fecha: toISODate(addDays(now, m.delta)),
  }))
}

// KPIs
export function getKPIs() {
  const activos = CASOS.filter(c => c.estado === 'Activo').length
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const en7dias = CASOS.filter(c => {
    if (!c.vencimiento || c.cerrado) return false
    const diff = Math.round((new Date(c.vencimiento + 'T00:00:00').getTime() - hoy.getTime()) / 86400000)
    return diff >= 0 && diff <= 7
  }).length
  const audSemana = AUDIENCIAS.filter(a => {
    const diff = Math.round((new Date(a.fecha + 'T00:00:00').getTime() - hoy.getTime()) / 86400000)
    return diff >= 0 && diff <= 7
  }).length
  return { total: 1248, activos: 842, en7dias, audSemana }
}
