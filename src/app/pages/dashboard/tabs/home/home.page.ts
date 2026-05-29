import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/user.service';
import {
  Firestore, collection, getCountFromServer,
  query, where, getDocs
} from '@angular/fire/firestore';
import { PrivilegiosService } from 'src/app/core/services/privilegios.service';
import { collectionGroup } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  // ── Sesión ──────────────────────────────────────────────────
  rol: string = '';
  uid: string = '';
  nombreUsuario: string = '';
  fotoUrl: string = '';

  // ── Conteos ─────────────────────────────────────────────────
  totalClientes: number = 0;
  totalMascotas: number = 0;
  totalVeterinarios: number = 0;
  totalRecepcionistas: number = 0;
  totalCitasPendientes: number = 0;

  // ── Estado ──────────────────────────────────────────────────
  privilegios: any = {};
  cargando: boolean = true;

  // ── Citas ───────────────────────────────────────────────────
  citasHoy: any[] = [];
  citasFiltradas: any[] = [];

  // ── Filtros ─────────────────────────────────────────────────
  filtroFecha: string = '';
  filtroVet: string = '';
  filtroEstado: string = '';
  vetsUnicos: string[] = [];

  // ── Textos dinámicos ────────────────────────────────────────
  eslogan: string = '';
  fraseMotivacional: string = '';

  fechaHoy: string = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // ── Getters originales ───────────────────────────────────────
  get tituloHero(): string {
    const map: any = {
      administrador: 'Panel de\nAdministración',
      recepcionista: 'Panel de\nRecepción',
      veterinario:   'Panel\nVeterinario',
      cliente:       'Mi Panel',
    };
    return map[this.rol] ?? 'Bienvenido';
  }

  get subtituloHero(): string {
    const map: any = {
      administrador: 'Panel de administración completo',
      recepcionista: 'Gestión de clientes y citas',
      veterinario:   'Tus citas y pacientes del día',
      cliente:       'Revisa tus mascotas y citas',
    };
    return map[this.rol] ?? '';
  }

  // ── Frases por rol ───────────────────────────────────────────
  private readonly frasesPorRol: Record<string, string[]> = {
    administrador: [
      '📊 Liderar con visión es tu mejor herramienta.',
      '🛠️ Cada decisión fortalece al equipo.',
      '🌟 La excelencia se construye con disciplina diaria.',
      '🚀 Tu liderazgo abre caminos para todos.',
      '💡 La claridad en tus metas inspira confianza.',
      '🔑 La organización es la llave del éxito.',
      '🏅 Tu ejemplo marca la cultura del sistema.',
      '📈 Cada mejora que implementas deja huella.',
      '🤝 La transparencia fortalece la confianza del equipo.',
      '🔥 Tu compromiso guía el rumbo hacia la excelencia.',
    ],
    recepcionista: [
      '📞 Tu sonrisa abre puertas a la confianza.',
      '🤝 La primera impresión depende de ti.',
      '🌟 Cada llamada atendida es una oportunidad de ayudar.',
      '🐾 Eres el puente entre clientes y mascotas.',
      '💡 Tu paciencia genera tranquilidad en cada visita.',
      '🚀 La eficiencia en tu trabajo agiliza todo el sistema.',
      '🏅 Tu amabilidad es tu mejor carta de presentación.',
      '🔑 La organización en tu agenda evita problemas futuros.',
      '❤️ Tu trato humano hace sentir a cada cliente especial.',
      '🔔 Cada detalle que cuidas mejora la experiencia del cliente.',
    ],
    veterinario: [
      '🐾 Cada mascota atendida es una vida mejorada.',
      '❤️ Tu vocación marca la diferencia.',
      '🌟 La salud animal refleja tu compromiso.',
      '🏅 Tu conocimiento salva vidas todos los días.',
      '💡 La empatía con los dueños genera confianza.',
      '🔬 Cada diagnóstico preciso es un paso hacia la excelencia.',
      '🚀 Tu pasión por los animales inspira respeto.',
      '🔑 La prevención es tu mejor herramienta de cuidado.',
      '📈 Cada tratamiento exitoso fortalece tu experiencia.',
      '🔥 Tu dedicación convierte tu profesión en un arte.',
    ],
    cliente: [
      '🐾 Tu mascota está en las mejores manos.',
      '❤️ El cuidado de tu compañero es nuestra prioridad.',
      '🌟 Juntos, garantizamos el bienestar de tu mascota.',
    ],
  };

  private readonly esloganesLaika: string[] = [
    '🚀 Laika nos enseñó que la valentía abre caminos; nosotros cuidamos a quienes confían en nosotros.',
    '🌌 Así como Laika alcanzó las estrellas, cada mascota merece alcanzar bienestar y amor.',
    '🐾 Laika fue pionera en el espacio; nuestra misión es ser pioneros en el cuidado animal.',
    '❤️ La confianza de Laika en la humanidad nos recuerda que cada vida merece respeto y protección.',
    '🌟 Laika viajó hacia lo desconocido; nosotros viajamos hacia la excelencia en cada consulta.',
    '🔬 Laika marcó la historia; cada diagnóstico preciso marca la diferencia en la vida de una mascota.',
    '🏅 El sacrificio de Laika inspira nuestro compromiso: cuidar con pasión y responsabilidad.',
    '💡 Laika abrió camino en la ciencia; nosotros abrimos camino en la empatía y el cuidado.',
    '🔔 Laika nos recuerda que cada ser vivo merece ser escuchado, atendido y protegido.',
    '📖 La historia de Laika vive en cada mascota que atendemos con dedicación y respeto.',
  ];

  private rand(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private firestore: Firestore,
    private privilegiosService: PrivilegiosService
  ) {}

  async ngOnInit() {
    this.rol = this.authService.getRolActual() ?? '';
    this.uid = this.authService.getUidActual() ?? '';

    const frases = this.frasesPorRol[this.rol] ?? this.frasesPorRol['cliente'];
    this.fraseMotivacional = this.rand(frases);
    this.eslogan           = this.rand(this.esloganesLaika);

    const coleccion = this.userService.getColeccionPorRol(this.rol);
    const userData  = await this.userService.getDocumentOnce(coleccion, this.uid);
    this.nombreUsuario = userData?.Nombre ?? 'Usuario';
    this.fotoUrl       = userData?.foto   ?? '';

    if (this.rol === 'recepcionista' || this.rol === 'veterinario') {
      this.privilegiosService.getPrivilegios(this.uid).subscribe(p => {
        this.privilegios = p ?? {};
      });
    }

    await this.cargarDatos();
    await this.cargarCitasHoy();
    this.cargando = false;
  }

  // ── Conteos (lógica original) ────────────────────────────────
async cargarDatos() {
  if (this.rol === 'administrador') {
    const [c, m, v, r, p] = await Promise.all([
      getCountFromServer(collection(this.firestore, 'clientes')),
      getCountFromServer(collectionGroup(this.firestore, 'mascotas')), // ✅
      getCountFromServer(collection(this.firestore, 'veterinarios')),
      getCountFromServer(collection(this.firestore, 'recepcionistas')),
      getCountFromServer(query(collection(this.firestore, 'citas'), where('estado', '==', 'pendiente'))),
    ]);
    this.totalClientes        = c.data().count;
    this.totalMascotas        = m.data().count;
    this.totalVeterinarios    = v.data().count;
    this.totalRecepcionistas  = r.data().count;
    this.totalCitasPendientes = p.data().count;
  }

  if (this.rol === 'recepcionista') {
    const [c, m, p] = await Promise.all([
      getCountFromServer(collection(this.firestore, 'clientes')),
      getCountFromServer(collectionGroup(this.firestore, 'mascotas')), // ✅
      getCountFromServer(query(collection(this.firestore, 'citas'), where('estado', '==', 'pendiente'))),
    ]);
    this.totalClientes        = c.data().count;
    this.totalMascotas        = m.data().count;
    this.totalCitasPendientes = p.data().count;
  }

  if (this.rol === 'veterinario') {
    const m = await getCountFromServer(collectionGroup(this.firestore, 'mascotas')); // ✅
    this.totalMascotas = m.data().count;
  }
}

  // ── Citas del día ────────────────────────────────────────────
async cargarCitasHoy() {
  const hoy = new Date();
  
  // Construir string "YYYY-MM-DD" igual al formato en Firestore
  const fechaHoy = `${hoy.getFullYear()}-${
    String(hoy.getMonth() + 1).padStart(2, '0')}-${
    String(hoy.getDate()).padStart(2, '0')}`;

  try {
    const q = query(
      collection(this.firestore, 'citas'),
      where('fecha', '==', fechaHoy)   // ✅ minúscula + string
    );
    const snap = await getDocs(q);
    this.citasHoy = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Extraer lista única de veterinarios para el filtro
    this.vetsUnicos = [...new Set(
      this.citasHoy
        .map(c => c.nombreVeterinario ?? '')  // ✅ campo correcto
        .filter(v => v)
    )];

    this.citasFiltradas = [...this.citasHoy];
  } catch (e) {
    console.error('Error cargando citas de hoy:', e);
    this.citasHoy = [];
    this.citasFiltradas = [];
  }
}

  // ── Filtros ─────────────────────────────────────────────────
aplicarFiltros() {
  this.citasFiltradas = this.citasHoy.filter(cita => {

    // Filtro estado — campo 'estado' minúscula
    if (this.filtroEstado && cita.estado !== this.filtroEstado) return false;

    // Filtro veterinario — usar nombreVeterinario directamente
    if (this.filtroVet && cita.nombreVeterinario !== this.filtroVet) return false;

    // Filtro fecha — comparar string "YYYY-MM-DD"
    if (this.filtroFecha) {
      // filtroFecha viene de un <input type="date"> → ya es "YYYY-MM-DD"
      if (cita.fecha !== this.filtroFecha) return false;
    }

    return true;
  });
}
}