# Messa: integración revisada — 18 de octubre de 2026

## Qué incluye esta entrega

Se ha recuperado el contenido de `mi-carta-app.rar`. Los dos RAR recibidos son
idénticos. Se conserva el archivo original y se trabaja en una copia separada.
La entrega reúne:

- La landing de `85e3a07`, que contiene el mismo trabajo de landing que `bb40cbc`.
- El ajuste anterior de temas `e613edd`.
- Los archivos modificados y nuevos de la rama local `carta-nueva`, guardados
  en un commit de respaldo antes de corregirlos.
- Las correcciones de acceso, contraseña y SQL de la primera revisión.
- Las correcciones de funcionamiento de la carta descritas más abajo.

El diseño de `wip-rebrand` se conserva en su rama archivada; no se mezcla
con la carta actual sin una elección de diseño. No hace falta la segunda
carpeta para recuperar el commit de la landing: venía en el historial Git.
Si esa segunda carpeta tiene cambios posteriores sin commit, esos archivos
no pueden recuperarse desde este RAR.

Rama de entrega: `integration/messa-revisada`.
El archivo `Messa-historial.bundle` conserva las ramas archivadas y la
integración. El ZIP contiene código y documentación; no contiene claves,
credenciales locales, dependencias ni la carpeta de despliegue.

## Correcciones de la carta

- Los padres con platos únicamente en subcategorías siguen apareciendo en la
  navegación. Al seleccionarlos se incluyen todos sus descendientes.
- Un error de red, categorías o platos no se presenta como restaurante
  inexistente o carta vacía: hay un mensaje y un botón de reintento.
- Las respuestas atrasadas y las cargas que terminan después de desmontar
  la página no crean suscripciones ni sustituyen datos más recientes.
- Las actualizaciones en tiempo real no vuelven a registrar la misma visita.
- Las URLs antiguas de categorías usan la misma carta, el mismo límite de plan
  y la misma comprobación de restaurante activo.
- El botón de favoritos responde, permite quitar la selección y la conserva
  en este navegador, separada por restaurante. No se sincroniza con cuentas.
  El almacenamiento bloqueado o dañado no rompe la carta.
- La ficha de plato se cierra con Escape, controla el foco y restaura el
  desplazamiento al cerrar. Los precios anteriores solo se tachan si hay rebaja.
- Una imagen que falló no impide mostrar otra URL de imagen al actualizarse.

## Correcciones de acceso y SQL

- Recuperación: los errores de Supabase o de red ya no muestran «Email enviado».
- Carga de sesión: un fallo no deja el acceso bloqueado; una consulta inicial
  atrasada no sobrescribe un evento de sesión más reciente.
- Cambio de contraseña: el botón se libera también ante errores de red.
- El esquema de referencia define una sola función `admin_get_all_restaurants`.
  Se corrigen ambigüedades de columnas y controles de identidad nula.
- Se impide la ejecución anónima de las funciones de administrador y se
  restringe a los propietarios la edición directa de campos administrativos.
- Se incluyen las columnas visuales, `is_special`, `allergens` y la función
  de tema que usa el código. Esto corrige la referencia para instalaciones
  nuevas. La base real se ha inspeccionado y migrado por separado.
- El editor guarda el teléfono en `social_phone`, que ya usa la carta, y
  permite guardar y borrar la dirección sin enviar columnas inexistentes.

## Cambios aplicados en Supabase

Proyecto comprobado contra la configuración de la app:
`alqtjwzivirbnynpzevn` (nombre del proyecto: `krea`).

Se han aplicado y registrado:

1. `20261018091900_repair_menu_and_admin_permissions`: añade subcategorías y
   estadísticas con RLS, corrige las cuatro funciones de administrador y
   restringe la edición de campos administrativos. Los padres de categorías
   deben pertenecer al mismo restaurante. Se fija el search_path del trigger.
2. `20261018092206_repair_restaurant_contact_fields`: añade la dirección al
   restaurante y permite su edición al propietario.

La comprobación antes y después conserva los mismos 3 restaurantes,
7 categorías y 12 platos. Los hashes de todo el contenido anterior coinciden;
no se han cambiado nombres, precios, planes, temas ni asignaciones.
Los informes de auditoría se conservan en la entrega privada y se excluyen
del repositorio público. No ejecutar el esquema completo
de referencia sobre esta base: estas migraciones ya constan como aplicadas.

## Verificación

```sh
npm ci
npm test
npm run build
```

Las pruebas de React montan los componentes reales con Supabase simulado:
no envían correos ni registran datos reales. El SQL se instala y se comprueba
en PostgreSQL en memoria (PGlite), con roles y auxiliares mínimos de Supabase.
También se ha reproducido el esquema real anterior y probado la migración
antes de aplicarla. Las pruebas automáticas no usan los datos de producción.

Las pruebas comprueban filtros, subcategorías, errores, favoritos, ficha,
reintento, suscripciones, enlaces antiguos, acceso de administrador y edición
permitida y prohibida por propietario. Resultado: 34 pruebas aprobadas. La compilación pasa. Vite mantiene
un aviso de tamaño del paquete JavaScript principal, que no impide compilar.
La lectura de las tres cartas mediante la API pública de Supabase se ha
comprobado sin insertar eventos de prueba. El envío de correos y el cambio
de contraseña con una cuenta real siguen pendientes de prueba.

## Pendientes de acceso y producto

1. El 18 de octubre se ha conectado la cuenta propietaria
   `contactoadrianrg-png` y comprobado su permiso de escritura. La integración
   se prepara en `repair/messa-integrada-20261018`, separada de `main`, para
   revisar y comprobar una vista previa antes de publicarla.
2. En Auth deben comprobarse las URL permitidas de recuperación:
   `http://localhost:5173/reset-password` y
   `https://mi-carta-app.vercel.app/reset-password`, además del envío de correo.
3. Vercel está instalado y permite identificar el proyecto
   `prj_yNOdt4LYCAK2LwiOYSRL6cDLQtXD`. Sin embargo, devuelve 403 al consultar
   despliegues y variables bajo `reativeadrias-projects`
   (`team_GH9Y4t4anKbCGCqenFdtXJTl`). La conexión no lista equipos accesibles.
   No hay CLI con credenciales disponible para el mismo proyecto. Se requiere
   revisar el acceso de esa conexión a ese espacio; no se ha publicado ni
   modificado la protección del proyecto.
4. No se han inventado precios ni creado promociones: siguen pendientes de
   definición. Se ha conservado la distribución actual del RAR.
5. Los platos disponibles de MAMAJUANA y La Tahona no tienen categorías
   asignadas; AGATA tiene 2 de sus 3 platos disponibles sin categoría.
   Se mantienen visibles en «Todos». No se han inventado asignaciones.

## Precisiones sobre el resumen inicial

`categories.parent_id` estaba en el archivo SQL, pero faltaba en la base real.
También faltaban ambas tablas de estadísticas. El código usa `dishes`, no
`platos`. `visit_count` sí existe en la base real: se ha conservado.

## Asesor de seguridad de Supabase

Tras la migración ya no aparecen los avisos de ejecución anónima de las
funciones administrativas ni el search_path mutable. Permanecen:

- [Funciones SECURITY DEFINER accesibles a usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable):
  son las cuatro funciones de administración utilizadas por el panel.
  Cada una comprueba la identidad admin y rechaza las demás cuentas; esos
  casos están probados. El permiso de autenticado es intencional para este diseño.
- [Protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection):
  figura desactivada; no se ha modificado esa opción de Auth.

## Cómo usar los archivos

Extraer el ZIP en una carpeta nueva. Conservar las carpetas originales.
Instalar dependencias con `npm ci`, configurar las variables públicas de
Supabase como indica README.md y revisar el resultado con `npm run dev`.

Para recuperar todas las ramas desde el bundle:

```sh
git clone Messa-historial.bundle messa-recuperada
cd messa-recuperada
git switch integration/messa-revisada
```

El bundle no tiene un remoto de GitHub operativo: añadirlo o cambiarlo solo
cuando se haya confirmado la cuenta y el permiso de escritura. No hacer push
a `main` antes de revisar la vista previa.
