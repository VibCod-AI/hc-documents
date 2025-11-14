# Plan de Rediseño - Sistema de Gestión de Documentos HabiCapital

## 🎨 Análisis de Diseño de Referencia

### Colores Principales
- **Púrpura Principal**: `#8B5CF6` (violeta vibrante)
- **Púrpura Oscuro**: `#7C3AED` (hover states)
- **Verde Éxito**: `#10B981` (estados aprobados, positivos)
- **Verde Claro**: `#34D399` (accents)
- **Amarillo/Naranja**: `#F59E0B` (pendiente, alertas)
- **Rojo**: `#EF4444` (rechazado, errores)
- **Gris Claro**: `#F3F4F6` (backgrounds)
- **Gris Medio**: `#9CA3AF` (texto secundario)
- **Gris Oscuro**: `#1F2937` (texto principal)

### Tipografía
- Font principal: `Inter` (ya está configurado)
- Tamaños jerárquicos claros
- Weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Componentes Clave Identificados

#### 1. Header/Navbar
- Logo "HabiCapital" en la esquina superior izquierda
- Buscador central con ícono
- Usuario autenticado en la esquina superior derecha con opción "Salir"
- Fondo blanco, sombra sutil

#### 2. Sidebar (Navegación Lateral)
- Fondo blanco con bordes sutiles
- Íconos + texto
- Item activo con fondo púrpura claro
- Secciones: Solicitudes, Aprobaciones
- Footer con versión "Matruscan Versión 1.0.0"

#### 3. Cards de Información
- Bordes redondeados `rounded-xl`
- Sombras sutiles
- Íconos con fondos de color claro (circular)
- Información jerárquica: número grande + descripción pequeña

#### 4. Tablas
- Headers con fondo blanco
- Rows con hover effect
- Estados con badges de colores (verde/amarillo/rojo)
- Acciones con ícono de ojo para ver detalles

#### 5. Badges de Estado
- Completo: fondo verde claro, texto verde oscuro
- Incompleto: fondo amarillo claro, texto amarillo oscuro
- Pendiente: fondo amarillo, texto oscuro
- Aprobado: fondo verde, texto blanco

#### 6. Botones
- Primary: fondo púrpura, texto blanco, rounded-lg
- Secondary: fondo blanco, borde, texto púrpura
- Icon buttons: solo ícono con hover effect

---

## 📋 Tareas de Implementación

### ✅ Fase 1: Configuración Base
- [ ] **Tarea 1.1**: Actualizar `tailwind.config.ts` con la nueva paleta de colores
- [ ] **Tarea 1.2**: Crear archivo de colores personalizados `/src/styles/colors.ts`
- [ ] **Tarea 1.3**: Verificar que Inter font está correctamente configurado

### ✅ Fase 2: Layout Principal
- [ ] **Tarea 2.1**: Crear componente `Navbar` con logo, buscador y usuario
- [ ] **Tarea 2.2**: Crear componente `Sidebar` con navegación y versión
- [ ] **Tarea 2.3**: Actualizar `layout.tsx` para incluir Navbar + Sidebar + contenido
- [ ] **Tarea 2.4**: Configurar grid/flex layout responsive

### ✅ Fase 3: Actualizar Header
- [ ] **Tarea 3.1**: Rediseñar `Header.tsx` con nuevo estilo (más compacto, sin gradientes)
- [ ] **Tarea 3.2**: Agregar logo "HabiCapital" (texto estilizado o SVG)
- [ ] **Tarea 3.3**: Ajustar colores y tipografía

### ✅ Fase 4: Dashboard de Clientes
- [ ] **Tarea 4.1**: Rediseñar `ClientDashboard.tsx`
  - [ ] Cards de estadísticas con íconos circulares de fondo de color
  - [ ] Tabla con nuevo estilo (bordes sutiles, hover effects)
  - [ ] Badges de estado con nuevos colores
  - [ ] Botón "Sincronizar" con estilo púrpura
- [ ] **Tarea 4.2**: Agregar íconos de `lucide-react` para estadísticas
- [ ] **Tarea 4.3**: Implementar tooltip mejorado con estilo consistente

### ✅ Fase 5: Gestión de Documentos
- [ ] **Tarea 5.1**: Rediseñar `ClientDocumentManager.tsx`
  - [ ] Buscador con nuevo estilo (ícono, bordes sutiles)
  - [ ] Cards de cliente con información más compacta
  - [ ] Progress bar con color púrpura
  - [ ] Checklist de documentos con nuevo estilo de cards
- [ ] **Tarea 5.2**: Actualizar estados de documentos (verde/amarillo) con nuevos tonos
- [ ] **Tarea 5.3**: Botones de acción con estilo consistente
- [ ] **Tarea 5.4**: Mejorar animaciones de carga (spinner púrpura)

### ✅ Fase 6: Componentes Compartidos
- [ ] **Tarea 6.1**: Crear componente `Button` reutilizable con variantes
  - Primary (púrpura)
  - Secondary (outline)
  - Success (verde)
  - Danger (rojo)
- [ ] **Tarea 6.2**: Crear componente `Badge` reutilizable
- [ ] **Tarea 6.3**: Crear componente `Card` reutilizable
- [ ] **Tarea 6.4**: Crear componente `Input` reutilizable con estilos consistentes

### ✅ Fase 7: Detalles y Pulido
- [ ] **Tarea 7.1**: Ajustar espaciados y márgenes para consistencia
- [ ] **Tarea 7.2**: Verificar responsive design (mobile, tablet, desktop)
- [ ] **Tarea 7.3**: Agregar transiciones suaves en hover states
- [ ] **Tarea 7.4**: Revisar accesibilidad (contraste, tamaños de texto)
- [ ] **Tarea 7.5**: Optimizar carga de íconos y assets

### ✅ Fase 8: Testing y Ajustes Finales
- [ ] **Tarea 8.1**: Probar todas las funcionalidades con nuevo diseño
- [ ] **Tarea 8.2**: Verificar que los colores sean consistentes en toda la app
- [ ] **Tarea 8.3**: Ajustar cualquier elemento que no se vea bien
- [ ] **Tarea 8.4**: Documentar componentes nuevos en README

---

## 🎯 Prioridades
1. **Alta**: Fase 1, 2, 3, 4, 5 (funcionalidad core)
2. **Media**: Fase 6 (componentes reutilizables)
3. **Baja**: Fase 7, 8 (pulido y optimización)

---

## 📝 Notas de Implementación
- Mantener toda la funcionalidad existente (búsqueda, carga, sincronización)
- No romper la integración con Apps Script y Zapier
- Preservar la base de datos SQLite y todas las queries
- Solo cambiar estilos y estructura visual
- Usar Tailwind CSS para todos los estilos (evitar CSS custom)

