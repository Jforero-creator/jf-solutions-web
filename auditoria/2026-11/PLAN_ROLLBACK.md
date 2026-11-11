# Plan de rollback y recuperación: jfsolutionsq.com

**Alcance:** sitio estático en Vercel (`jf-solutions`), con despliegue automático desde la rama `main` de `Jforero-creator/jf-solutions-web`.
**Regla:** no ejecutar restauraciones sobre producción sin decisión del propietario. Durante esta auditoría no se ejecutó ninguna.

## Roles (RACI)

| Actividad | Responsable (R) | Aprueba (A) | Consultado (C) | Informado (I) |
|---|---|---|---|---|
| Detectar un despliegue defectuoso | JF / monitor externo | — | Dev | — |
| Decidir el rollback | JF | **JF** | Dev | — |
| Ejecutar el rollback (Vercel) | JF o Dev con acceso | JF | — | — |
| Corregir en el código | Dev | JF | — | — |
| Verificar después del rollback | Dev | JF | — | Clientes afectados, si hubo formularios perdidos |

## Situación actual (03-nov-2026)

- Producción: `dpl_FcFGH86Dg6AE48LNAzx7WAcA1Peu`, commit `9285e42` ("Instalar Google Analytics 4"), estado READY.
- Candidato a rollback inmediato: `dpl_HKuy9qivsDEMLjkZ63UutieS4cos`, commit `a7670d2` (PR #5).
- Cada commit en `main` queda como un despliegue inmutable en Vercel y como un commit en GitHub. Ambos sirven de respaldo del código.

## A. Restaurar ante un despliegue defectuoso (la vía más rápida, unos 2 minutos)

1. Abre **Vercel → proyecto `jf-solutions` → Deployments**.
2. Localiza el último despliegue de *Production* que funcionaba bien (estado Ready). Si esta rama se fusiona, será el de `9285e42`.
3. Menú **⋯ → Instant Rollback** (o "Promote to Production" si ya no figura como candidato).
4. Comprueba: `https://www.jfsolutionsq.com/` carga, el formulario aparece y `/servicios/` y `/en/services/` responden.
5. Importante: tras un Instant Rollback, Vercel **deja de promover automáticamente** los nuevos commits de `main` hasta que se vuelve a promover un despliegue. Anótalo y continúa con el paso B.

## B. Revertir en el código (permanente)

Opción 1: desde GitHub. Abre el Pull Request fusionado → **Revert** → se crea un PR de reversión → revísalo y fusiónalo.

Opción 2: desde la terminal.

```bash
git checkout main && git pull
git revert -m 1 <sha-del-merge-de-audit-remediation>   # crea un commit que deshace el PR
git push origin main                                   # Vercel despliega la versión revertida
```

Vuelve a promover a producción en Vercel si hiciste un Instant Rollback (A.5).

## C. Reversión parcial (solo una parte del cambio)

| Síntoma tras el despliegue | Archivo a revertir | Efecto |
|---|---|---|
| Algo no carga y la consola muestra "Content Security Policy" | `vercel.json`: quitar solo la entrada `Content-Security-Policy` | Se conservan las demás cabeceras |
| GA no registra nada aunque se acepte el aviso | `assets/consent.js` (revisar) o restaurar temporalmente el fragmento original de GA en `index.html` | **Ojo:** restaurar el fragmento vuelve a cargar GA sin consentimiento |
| El formulario falla | `assets/servicios.js` o el bloque `<script>` del formulario de `index.html`: `git checkout 9285e42 -- <archivo>` | Vuelve al formulario anterior |
| Un video móvil no se reproduce | Quitar la línea `<source … -720.mp4 …>` del video afectado | Sirve el de 1080p |

## D. Verificar la integridad del código

```bash
git fetch origin
git log --oneline -5 origin/main      # el último commit debe coincidir con el desplegado en Vercel
git status                            # sin cambios locales inesperados
```

En Vercel, cada despliegue muestra el SHA del commit (campo *Source*): debe coincidir con `origin/main`. GitHub conserva el historial completo; para tener una copia fuera de GitHub, usa `git clone --mirror https://github.com/Jforero-creator/jf-solutions-web` y guárdala en Google Drive una vez al mes.

## E. Configuraciones esenciales que hay que poder recuperar

No todo vive en el repositorio. Documenta y guarda fuera de Vercel (por ejemplo, en un documento de Drive con acceso restringido):

| Configuración | Dónde vive | Cómo recuperarla |
|---|---|---|
| Cabeceras, `trailingSlash`, caché | `vercel.json` (repositorio) | Con git |
| Dominios `www.jfsolutionsq.com` y raíz → www (308) | Vercel → Settings → Domains | Volver a añadirlos y verificar el DNS en Squarespace |
| DNS del dominio | Squarespace (registrador) | Exportar o anotar los registros actuales (A/CNAME hacia Vercel) |
| Clave de Web3Forms y correo de destino | Panel de Web3Forms y el código | La clave está en el código; el destino, en el panel |
| ID de GA4 (`G-VCKX3PTT1D`) | Google Analytics y `index.html` | Desde la consola de GA |
| Protección de vistas previas (SSO "all except custom domains") | Vercel → Settings → Deployment Protection | Reconfigurar manualmente |
| Google Search Console | Cuenta de Google | Verificación por DNS o meta |

## F. Prueba del procedimiento (recomendada, sin tocar producción)

Una vez al trimestre, en un momento de poco tráfico y con decisión del propietario, haz un simulacro de rollback:

1. Ejecuta A (Instant Rollback al despliegue anterior).
2. Verifica.
3. Vuelve a promover el actual.
4. Anota los tiempos.

No se ejecutó en esta auditoría porque afecta a producción.
